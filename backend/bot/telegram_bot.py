import asyncio
import random
import logging
from typing import List, Optional, Callable, Dict, TYPE_CHECKING
from datetime import datetime
from telegram import Bot, Message
from telegram.error import TelegramError
from telegram.constants import ChatMemberStatus
from telegram.ext import Application
from backend.models.config import Config, PostConfig, ChannelConfig, PostStatus, LogEntry, ChannelStats
from backend.bot.post_processor import PostProcessor

if TYPE_CHECKING:
    from backend.bot.message_handler import setup_message_handler

logger = logging.getLogger(__name__)


class TelegramBot:
    def __init__(self, token: str):
        self.bot = Bot(token=token)
        self.token = token
        self.config: Optional[Config] = None
        self.status: PostStatus = PostStatus.IDLE
        self.current_progress = 0
        self.total_posts = 0
        self.remaining_time = 0
        self._total_posts_ever = 0  # Total acumulado de postagens (persistente)
        self._total_failures_ever = 0  # Total acumulado de falhas (persistente)
        self.log_callback: Optional[Callable[[LogEntry], None]] = None
        self.progress_callback: Optional[Callable[[dict], None]] = None
        self._stop_flag = False
        self._posting_task: Optional[asyncio.Task] = None
        self._stored_messages: Dict[str, List[Message]] = {}
        self._application: Optional[Application] = None
        self._polling_task: Optional[asyncio.Task] = None
        self._channel_stats: Dict[str, ChannelStats] = {}  # Estatísticas por channel_id
        self._skip_next_delay = False  # Flag para pular próximo delay

    def set_config(self, config: Config):
        """Define a configuração do bot"""
        self.config = config
        # Inicializa estatísticas para canais de destino se não existirem
        if config and config.destination_channels:
            for channel in config.destination_channels:
                if channel.channel_id not in self._channel_stats:
                    self._channel_stats[channel.channel_id] = ChannelStats(
                        channel_id=channel.channel_id,
                        name=channel.name,
                        total_posts=0,
                        total_failures=0,
                        is_active=True,
                        status="active"
                    )
        # Reinicia polling se necessário para aplicar nova configuração
        if self._application and not self._polling_task:
            asyncio.create_task(self._start_polling())

    def set_log_callback(self, callback: Callable[[LogEntry], None]):
        """Define callback para logs"""
        self.log_callback = callback

    def set_progress_callback(self, callback: Callable[[dict], None]):
        """Define callback para progresso"""
        self.progress_callback = callback

    def store_message(self, channel_id: str, message: Message):
        """Armazena mensagem recebida do canal"""
        # Normaliza o ID para usar como chave de armazenamento
        normalized_id = self._normalize_channel_id(channel_id)
        storage_key = str(normalized_id).lstrip('-')
        
        if storage_key not in self._stored_messages:
            self._stored_messages[storage_key] = []
        self._stored_messages[storage_key].append(message)

    def _format_time(self, seconds: int) -> str:
        """Formata tempo em segundos para formato legível"""
        if seconds < 60:
            return f"{seconds} segundo{'s' if seconds != 1 else ''}"
        elif seconds < 3600:
            minutes = seconds // 60
            secs = seconds % 60
            if secs == 0:
                return f"{minutes} minuto{'s' if minutes != 1 else ''}"
            return f"{minutes} minuto{'s' if minutes != 1 else ''} e {secs} segundo{'s' if secs != 1 else ''}"
        else:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            secs = seconds % 60
            parts = [f"{hours} hora{'s' if hours != 1 else ''}"]
            if minutes > 0:
                parts.append(f"{minutes} minuto{'s' if minutes != 1 else ''}")
            if secs > 0 and hours == 0:
                parts.append(f"{secs} segundo{'s' if secs != 1 else ''}")
            return " e ".join(parts)

    def _log(self, message: str, level: str = "info"):
        """Envia log via callback"""
        log_entry = LogEntry(
            timestamp=datetime.now().strftime("%H:%M:%S"),
            message=message,
            level=level
        )
        if self.log_callback:
            self.log_callback(log_entry)
        logger.log(
            logging.INFO if level == "info" else logging.ERROR if level == "error" else logging.WARNING,
            message
        )

    def _update_progress(self, current: int, total: int, remaining_time: int):
        """Atualiza progresso via callback"""
        self.current_progress = current
        self.total_posts = total
        self.remaining_time = remaining_time
        if self.progress_callback:
            self.progress_callback({
                "current": current,
                "total": total,
                "remaining_time": remaining_time,
                "status": self.status.value,
                "total_posts_ever": self._total_posts_ever,  # Inclui totais acumulados
                "total_failures_ever": self._total_failures_ever
            })

    def _normalize_channel_id(self, channel_id: str):
        """Normaliza o ID do canal para diferentes formatos"""
        # Remove @ se presente
        clean_id = channel_id.lstrip('@').strip()
        
        # Tenta converter para int se for numérico (incluindo negativos)
        try:
            # Verifica se é um número (pode ser negativo)
            if clean_id.lstrip('-').isdigit():
                num_id = int(clean_id)
                # Para canais privados do Telegram, mantém o formato negativo
                # Se começar com -100, mantém como está
                if num_id < 0 or str(clean_id).startswith('-100'):
                    return num_id
                return num_id
        except ValueError:
            pass
        
        # Retorna como string (username ou ID string)
        return clean_id
    
    async def get_channel_messages(self, channel_id: str, limit: int = 100) -> List[Message]:
        """Obtém mensagens do canal de estoque - confia principalmente em mensagens armazenadas via polling"""
        try:
            # Normaliza o ID do canal
            normalized_id = self._normalize_channel_id(channel_id)
            
            # Para verificação de mensagens armazenadas, usa string
            storage_key = str(normalized_id).lstrip('-')
            
            # PRIMEIRO: Sempre tenta obter mensagens armazenadas (via polling)
            if storage_key in self._stored_messages:
                stored = self._stored_messages[storage_key]
                if len(stored) > 0:
                    return stored[-limit:] if len(stored) > limit else stored
            
            # Se não há mensagens armazenadas, retorna vazio
            # O sistema confia no polling para receber novas mensagens
            # Não tenta acessar o canal via API pois isso pode causar erros
            return []
            
        except Exception as e:
            # Não loga erro aqui para evitar spam de logs
            # As mensagens serão recebidas via polling automaticamente
            return []

    async def post_to_channel(self, channel_id: str, message_data: dict) -> bool:
        """Posta mensagem processada em um canal usando copy_message quando possível"""
        try:
            # Normaliza o ID do canal
            normalized_id = self._normalize_channel_id(channel_id)
            original_message = message_data.get('message')
            
            if not original_message:
                return False
            
            async with self.bot:
                # Tenta diferentes formatos de ID para acessar o canal
                # Primeiro tenta o ID original exatamente como foi fornecido
                dest_chat = None
                formats_to_try = [channel_id]  # Tenta o ID original primeiro
                
                # Depois tenta o ID normalizado
                if normalized_id != channel_id:
                    formats_to_try.append(normalized_id)
                
                # Se for string, tenta também com @
                if isinstance(normalized_id, str) and not normalized_id.startswith('@'):
                    formats_to_try.append(f"@{normalized_id}")
                
                # Se for número, tenta também como string e formatos alternativos
                if isinstance(normalized_id, int):
                    # Para canais privados, mantém o formato negativo
                    if normalized_id < 0:
                        # IDs negativos devem ser mantidos como estão
                        # O Telegram aceita IDs negativos diretamente
                        formats_to_try.extend([
                            normalized_id,  # Como int negativo (prioridade)
                            str(normalized_id),  # Como string negativa
                        ])
                    else:
                        # ID positivo, tenta formatos alternativos
                        formats_to_try.extend([
                            normalized_id,
                            str(normalized_id),
                            f"-100{normalized_id}",
                            f"-100{normalized_id:0>13}",
                        ])
                elif isinstance(normalized_id, str):
                    # Se for string numérica, tenta como int também
                    try:
                        num_id = int(normalized_id)
                        if num_id < 0:
                            # IDs negativos devem ser mantidos como estão
                            formats_to_try.extend([
                                num_id,  # Como int negativo (prioridade)
                                str(num_id),  # Como string negativa
                            ])
                        else:
                            formats_to_try.extend([
                                num_id,
                                str(num_id),
                                f"-100{num_id}",
                                f"-100{num_id:0>13}",
                            ])
                    except ValueError:
                        pass
                
                # Remove duplicatas mantendo ordem
                seen = set()
                unique_formats = []
                for fmt in formats_to_try:
                    fmt_str = str(fmt)
                    if fmt_str not in seen:
                        seen.add(fmt_str)
                        unique_formats.append(fmt)
                formats_to_try = unique_formats
                
                # Tenta cada formato até encontrar um que funcione
                dest_chat = None
                last_error = None
                for idx, chat_id_format in enumerate(formats_to_try):
                    try:
                        dest_chat = await self.bot.get_chat(chat_id=chat_id_format)
                        self._log(f"Postando no canal: {dest_chat.title or chat_id_format} (ID: {dest_chat.id})", "info")
                        break
                    except TelegramError as e:
                        last_error = e
                        # Log apenas se for a última tentativa ou se for um erro diferente de "Chat not found"
                        if chat_id_format == formats_to_try[-1] or (hasattr(e, 'message') and 'not found' not in str(e).lower()):
                            self._log(f"Tentativa {idx+1}/{len(formats_to_try)} com formato '{chat_id_format}': {str(e)}", "debug")
                        continue
                
                if not dest_chat:
                    self._log(f"Erro ao acessar canal de destino {channel_id}: {str(last_error) if last_error else 'Nenhum formato funcionou'}", "error")
                    self._log(f"Tentados {len(formats_to_try)} formatos: " + ", ".join(str(f) for f in formats_to_try[:5]) + (f" ... (+{len(formats_to_try)-5} mais)" if len(formats_to_try) > 5 else ""), "info")
                    self._log("Certifique-se de que:", "warning")
                    self._log("1. O bot é admin do canal de destino", "warning")
                    self._log("2. O bot tem permissão para enviar mensagens", "warning")
                    self._log("3. O ID do canal está correto", "warning")
                    return False
                
                # Usa o ID real do chat retornado pela API (mais confiável)
                clean_channel_id = dest_chat.id
                
                # Se tiver mídia, tenta copiar a mensagem
                if message_data.get('has_media'):
                    try:
                        # Copia a mensagem (isso preserva a mídia)
                        copied = await self.bot.copy_message(
                            chat_id=clean_channel_id,
                            from_chat_id=original_message.chat_id,
                            message_id=original_message.message_id
                        )
                        
                        # Se tiver caption customizado ou botão, edita a mensagem
                        if message_data.get('caption') or message_data.get('reply_markup'):
                            try:
                                if original_message.video or original_message.photo:
                                    await self.bot.edit_message_caption(
                                        chat_id=clean_channel_id,
                                        message_id=copied.message_id,
                                        caption=message_data.get('caption'),
                                        reply_markup=message_data.get('reply_markup'),
                                        parse_mode='HTML'  # Suporta formatação HTML
                                    )
                                elif message_data.get('reply_markup'):
                                    # Apenas atualiza o botão para documentos/animações
                                    await self.bot.edit_message_reply_markup(
                                        chat_id=clean_channel_id,
                                        message_id=copied.message_id,
                                        reply_markup=message_data.get('reply_markup')
                                    )
                                    # Para documentos, tenta editar o caption também
                                    if message_data.get('caption'):
                                        try:
                                            await self.bot.edit_message_caption(
                                                chat_id=clean_channel_id,
                                                message_id=copied.message_id,
                                                caption=message_data.get('caption'),
                                                parse_mode='HTML'  # Suporta formatação HTML
                                            )
                                        except:
                                            pass  # Alguns tipos de mídia não suportam caption editável
                            except Exception as e:
                                self._log(f"Erro ao editar mensagem copiada: {str(e)}", "warning")
                                # Se não conseguir editar, deleta e reenvia com download
                                try:
                                    await self.bot.delete_message(chat_id=clean_channel_id, message_id=copied.message_id)
                                    return await self._send_media_with_download(clean_channel_id, original_message, message_data)
                                except:
                                    pass
                        
                        return True
                    except TelegramError as e:
                        self._log(f"Erro ao copiar mensagem, tentando método alternativo: {str(e)}", "warning")
                        # Fallback para método de download/upload
                        return await self._send_media_with_download(clean_channel_id, original_message, message_data)
                else:
                    # Mensagem de texto simples
                    await self.bot.send_message(
                        chat_id=clean_channel_id,
                        text=message_data.get('text', ''),
                        reply_markup=message_data.get('reply_markup'),
                        parse_mode='HTML'  # Suporta formatação HTML (negrito, itálico, links, etc.)
                    )
                    return True
        except TelegramError as e:
            self._log(f"Erro ao postar no canal {channel_id}: {str(e)}", "error")
            return False
        except Exception as e:
            self._log(f"Erro inesperado ao postar: {str(e)}", "error")
            return False

    async def _send_media_with_download(self, channel_id: str, message: Message, message_data: dict) -> bool:
        """Método alternativo: baixa e reenvia a mídia usando download_to_memory"""
        try:
            from io import BytesIO
            
            async with self.bot:
                if message.video:
                    file = await message.video.get_file()
                    # Usa download_to_memory() que retorna bytes
                    file_bytes = await file.download_to_memory()
                    bio = BytesIO(file_bytes)
                    bio.seek(0)
                    await self.bot.send_video(
                        chat_id=channel_id,
                        video=bio,
                        caption=message_data.get('caption'),
                        reply_markup=message_data.get('reply_markup'),
                        parse_mode='HTML'  # Suporta formatação HTML
                    )
                    return True
                elif message.photo:
                    # Pega a foto de maior resolução
                    file = await message.photo[-1].get_file()
                    file_bytes = await file.download_to_memory()
                    bio = BytesIO(file_bytes)
                    bio.seek(0)
                    await self.bot.send_photo(
                        chat_id=channel_id,
                        photo=bio,
                        caption=message_data.get('caption'),
                        reply_markup=message_data.get('reply_markup'),
                        parse_mode='HTML'  # Suporta formatação HTML
                    )
                    return True
                elif message.document:
                    file = await message.document.get_file()
                    file_bytes = await file.download_to_memory()
                    bio = BytesIO(file_bytes)
                    bio.seek(0)
                    await self.bot.send_document(
                        chat_id=channel_id,
                        document=bio,
                        filename=message.document.file_name,
                        caption=message_data.get('caption'),
                        reply_markup=message_data.get('reply_markup'),
                        parse_mode='HTML'  # Suporta formatação HTML
                    )
                    return True
                elif message.animation:
                    file = await message.animation.get_file()
                    file_bytes = await file.download_to_memory()
                    bio = BytesIO(file_bytes)
                    bio.seek(0)
                    await self.bot.send_animation(
                        chat_id=channel_id,
                        animation=bio,
                        caption=message_data.get('caption'),
                        reply_markup=message_data.get('reply_markup'),
                        parse_mode='HTML'  # Suporta formatação HTML
                    )
                    return True
            return False
        except Exception as e:
            self._log(f"Erro ao baixar e reenviar mídia: {str(e)}", "error")
            # Tenta usar file_id como último recurso (pode não funcionar entre diferentes chats)
            try:
                if message.video:
                    await self.bot.send_video(
                        chat_id=channel_id,
                        video=message.video.file_id,
                        caption=message_data.get('caption'),
                        reply_markup=message_data.get('reply_markup')
                    )
                    return True
                elif message.photo:
                    await self.bot.send_photo(
                        chat_id=channel_id,
                        photo=message.photo[-1].file_id,
                        caption=message_data.get('caption'),
                        reply_markup=message_data.get('reply_markup')
                    )
                    return True
            except Exception as e2:
                self._log(f"Erro ao usar file_id: {str(e2)}", "error")
            return False

    async def start_posting(self):
        """Inicia o processo de postagem - aguarda indefinidamente por mensagens"""
        if not self.config:
            self._log("Configuração não definida", "error")
            self.status = PostStatus.IDLE
            return
        
        if not self.config.stock_channel:
            self._log("Canal de estoque não configurado", "error")
            self.status = PostStatus.IDLE
            return
        
        if not self.config.destination_channels:
            self._log("Nenhum canal de destino configurado", "error")
            self.status = PostStatus.IDLE
            return

        self.status = PostStatus.RUNNING
        self._stop_flag = False
        
        # RESETA contadores da sessão atual ao iniciar
        self.current_progress = 0
        self.total_posts = 0
        self._update_progress(0, 0, 0)
        
        self._log("🚀 Iniciando sistema de postagens automáticas...", "info")
        
        # Garante que o polling está rodando
        if not self._application or not (hasattr(self._application, '_running') and self._application._running):
            self._log("📡 Iniciando conexão com Telegram...", "info")
            await self._start_polling()
            # Aguarda um pouco para o polling iniciar
            await asyncio.sleep(2)
        
        # Obtém ID do canal de estoque
        channel_id = self.config.stock_channel.channel_id
        num_channels = len(self.config.destination_channels)
        self._log(f"📥 Monitorando canal de estoque: {channel_id}", "info")
        self._log(f"📤 {num_channels} canal{'is' if num_channels != 1 else ''} de destino configurado{'s' if num_channels != 1 else ''}", "info")
        self._log("⏳ Aguardando mensagens para repostar...", "info")
        self._log("ℹ️ O sistema usa polling para receber mensagens automaticamente - não é necessário acessar o canal via API", "info")
        
        # Loop principal: aguarda mensagens indefinidamente
        processed_message_ids = set()  # Rastreia mensagens já processadas
        
        # Contador para reduzir logs de "nenhuma mensagem"
        no_message_count = 0
        
        while not self._stop_flag:
            # Obtém mensagens do canal de estoque (apenas mensagens armazenadas via polling)
            messages = await self.get_channel_messages(channel_id)
            
            # Filtra apenas mensagens com conteúdo válido e que ainda não foram processadas
            valid_messages = [
                msg for msg in messages 
                if (msg.video or msg.photo or msg.document or msg.text) 
                and msg.message_id not in processed_message_ids
            ]
            
            if valid_messages:
                # Reset contador quando encontra mensagens
                no_message_count = 0
                # Há mensagens para processar
                num_messages = len(valid_messages)
                num_channels = len(self.config.destination_channels)
                total_operations = num_messages * num_channels
                self._log(f"📨 {num_messages} nova(s) mensagem(ns) encontrada(s) para postar", "info")
                self._log(f"📊 Total de {total_operations} postagem(ns) a realizar em {num_channels} canal{'is' if num_channels != 1 else ''}", "info")
                # Conta apenas o número de mensagens, não o total de operações
                self.total_posts = num_messages
                
                # Processa cada mensagem
                for msg_idx, message in enumerate(valid_messages, 1):
                    if self._stop_flag:
                        self._log("Postagem interrompida pelo usuário", "warning")
                        break
                    
                    # Marca mensagem como processada
                    processed_message_ids.add(message.message_id)
                    
                    # Processa mensagem
                    message_data = PostProcessor.process_message(message, self.config.post_config)
                    
                    # Posta em cada canal de destino
                    for channel_idx, channel in enumerate(self.config.destination_channels):
                        if self._stop_flag:
                            break
                        
                        success = await self.post_to_channel(channel.channel_id, message_data)
                        
                        # Atualiza estatísticas
                        self._update_channel_stats(channel.channel_id, channel.name, success)
                        
                        # Calcula delay apenas entre mensagens diferentes, não entre canais da mesma mensagem
                        is_last_channel = channel_idx == len(self.config.destination_channels) - 1
                        is_last_message = msg_idx == len(valid_messages)
                        
                        # Calcula delay para próxima mensagem
                        if is_last_channel and not is_last_message:
                            delay = random.randint(
                                self.config.post_config.delay_min,
                                self.config.post_config.delay_max
                            )
                        else:
                            delay = 0
                        
                        # Log com status de sucesso/falha e tempo até próxima postagem
                        if success:
                            self._total_posts_ever += 1  # Incrementa total acumulado
                            status_msg = f"✅ SUCESSO: Postado no canal '{channel.name}'"
                            if delay > 0:
                                status_msg += f" | Próxima postagem em {self._format_time(delay)}"
                            self._log(status_msg, "success")
                        else:
                            self._total_failures_ever += 1  # Incrementa total de falhas acumulado
                            error_msg = f"❌ FALHA: Erro ao postar no canal '{channel.name}'"
                            if delay > 0:
                                error_msg += f" | Próxima tentativa em {self._format_time(delay)}"
                            self._log(error_msg, "error")
                        
                        # Incrementa progresso apenas quando termina de postar em TODOS os canais de uma mensagem
                        if is_last_channel:
                            self.current_progress += 1
                            self._log(f"📊 Progresso: {self.current_progress}/{self.total_posts} mensagens processadas", "info")
                        
                        # Delay apenas após postar em todos os canais de uma mensagem
                        if is_last_channel and not is_last_message:
                            # Atualiza tempo restante (baseado em mensagens restantes, não operações)
                            remaining_messages = len(valid_messages) - msg_idx
                            # Usa o delay calculado para esta mensagem
                            remaining = remaining_messages * delay
                            self._update_progress(self.current_progress, self.total_posts, remaining)
                            
                            if not self._stop_flag:
                                # Verifica se deve pular o delay
                                if self._skip_next_delay:
                                    self._skip_next_delay = False
                                    self._log("⚡ Delay pulado - postando imediatamente", "info")
                                else:
                                    await asyncio.sleep(delay)
                        elif is_last_channel:
                            # Última mensagem - atualiza progresso final
                            self._update_progress(self.current_progress, self.total_posts, 0)
                        else:
                            # Ainda processando canais da mesma mensagem - atualiza progresso sem delay
                            remaining_messages = len(valid_messages) - msg_idx
                            avg_delay = (self.config.post_config.delay_min + self.config.post_config.delay_max) // 2
                            remaining = remaining_messages * avg_delay
                            self._update_progress(self.current_progress, self.total_posts, remaining)
                
                # Após processar todas as mensagens, reseta o progresso e continua aguardando
                self.current_progress = 0
                self.total_posts = 0
                self._update_progress(0, 0, 0)
                self._log("✅ Todas as mensagens foram processadas. Aguardando novas mensagens...", "info")
            else:
                # Não há mensagens - RESETA contadores para garantir que não mostre valores antigos
                if self.total_posts > 0 or self.current_progress > 0:
                    self.current_progress = 0
                    self.total_posts = 0
                    self._update_progress(0, 0, 0)
                
                # Não há mensagens, aguarda um pouco antes de verificar novamente
                no_message_count += 1
                
                # Log apenas a cada 12 tentativas (1 minuto) para evitar spam
                if no_message_count == 1:
                    self._log("⏳ Aguardando mensagens do canal de estoque...", "info")
                    self._log("💡 Dica: Envie os vídeos/fotos para o canal de estoque - eles serão processados automaticamente quando recebidos", "info")
                elif no_message_count % 12 == 0:
                    # Log a cada minuto
                    self._log("⏳ Ainda aguardando mensagens... O sistema está monitorando o canal via polling", "info")
                
                # Aguarda 5 segundos antes de verificar novamente
                await asyncio.sleep(5)
        
        # Se saiu do loop, foi porque o usuário parou
        if self._stop_flag:
            self.status = PostStatus.STOPPED
            self._log("Postagem interrompida pelo usuário", "warning")
        else:
            self.status = PostStatus.IDLE
        
        # RESETA contadores ao finalizar sessão
        self.current_progress = 0
        self.total_posts = 0
        self._update_progress(0, 0, 0)

    async def stop_posting(self):
        """Para o processo de postagem"""
        self._stop_flag = True
        self.status = PostStatus.STOPPED
        # RESETA contadores da sessão ao parar
        self.current_progress = 0
        self.total_posts = 0
        self._update_progress(0, 0, 0)
        self._log("Parando postagens...", "warning")
    
    def skip_next_delay(self):
        """Pula o próximo delay - força postagem imediata"""
        self._skip_next_delay = True
        self._log("⚡ Próxima postagem será imediata (delay pulado)", "info")
    
    def clear_all_messages(self):
        """Limpa todas as mensagens armazenadas"""
        count = sum(len(msgs) for msgs in self._stored_messages.values())
        self._stored_messages.clear()
        self._log(f"🗑️ {count} mensagem(ns) removida(s) da fila", "info")
        return count

    def get_status(self) -> dict:
        """Retorna status atual"""
        return {
            "status": self.status.value,
            "current": self.current_progress,
            "total": self.total_posts,
            "remaining_time": self.remaining_time,
            "total_posts_ever": self._total_posts_ever,  # Total acumulado
            "total_failures_ever": self._total_failures_ever  # Total de falhas acumulado
        }
    
    async def _start_polling(self):
        """Inicia polling em background para receber updates do Telegram"""
        try:
            if self._application:
                # Verifica se já está rodando
                try:
                    if hasattr(self._application, '_running') and self._application._running:
                        return
                except:
                    pass
            
            # Cria Application se não existir
            if not self._application:
                self._application = Application.builder().token(self.token).build()
                # Importação tardia para evitar circular
                from backend.bot.message_handler import setup_message_handler
                setup_message_handler(self._application, self)
            
            # Inicia polling em background usando run_until_complete em thread separada
            if not self._polling_task or self._polling_task.done():
                def run_polling():
                    try:
                        self._application.run_polling(
                            drop_pending_updates=True,
                            allowed_updates=["message", "channel_post"],
                            stop_signals=None  # Não para com sinais do sistema
                        )
                    except Exception as e:
                        logger.error(f"Erro no polling: {e}", exc_info=True)
                
                # Executa polling em thread separada para não bloquear
                import threading
                polling_thread = threading.Thread(target=run_polling, daemon=True)
                polling_thread.start()
                self._polling_task = asyncio.create_task(asyncio.sleep(0))  # Task dummy para controle
                self._log("Polling iniciado - bot está recebendo updates do Telegram", "info")
        except Exception as e:
            self._log(f"Erro ao iniciar polling: {str(e)}", "error")
            logger.error(f"Erro ao iniciar polling: {e}", exc_info=True)
    
    async def _stop_polling(self):
        """Para o polling"""
        try:
            if self._application:
                try:
                    await self._application.stop()
                    self._log("Polling parado", "info")
                except Exception as e:
                    logger.error(f"Erro ao parar application: {e}")
        except Exception as e:
            logger.error(f"Erro ao parar polling: {e}")
    
    def _update_channel_stats(self, channel_id: str, channel_name: str, success: bool):
        """Atualiza estatísticas de um canal"""
        if channel_id not in self._channel_stats:
            self._channel_stats[channel_id] = ChannelStats(
                channel_id=channel_id,
                name=channel_name,
                total_posts=0,
                total_failures=0,
                is_active=True,
                status="active"
            )
        
        stats = self._channel_stats[channel_id]
        stats.name = channel_name  # Atualiza nome caso tenha mudado
        
        now = datetime.now().isoformat()
        if success:
            stats.total_posts += 1
            stats.last_post_date = now
            stats.status = "active"
        else:
            stats.total_failures += 1
            stats.last_failure_date = now
            # Se tiver muitas falhas recentes, marca como erro
            if stats.total_failures > 0 and stats.total_posts == 0:
                stats.status = "error"
            elif stats.total_failures > stats.total_posts * 2:
                stats.status = "error"
    
    def get_channel_stats(self) -> List[ChannelStats]:
        """Retorna estatísticas de todos os canais"""
        # Atualiza status baseado na configuração atual
        if self.config:
            # Marca canais de destino como ativos/inativos
            active_channel_ids = {ch.channel_id for ch in self.config.destination_channels}
            
            for channel_id, stats in self._channel_stats.items():
                stats.is_active = channel_id in active_channel_ids
                if not stats.is_active:
                    stats.status = "inactive"
                elif stats.status == "unknown":
                    stats.status = "active"
        
        return list(self._channel_stats.values())
    
    def get_channel_stats_summary(self) -> dict:
        """Retorna resumo das estatísticas de canais"""
        all_stats = self.get_channel_stats()
        
        if not all_stats:
            return {
                "total_channels": 0,
                "active_channels": 0,
                "inactive_channels": 0,
                "channels_with_errors": 0,
                "total_posts": 0,
                "total_failures": 0,
                "success_rate": 0.0
            }
        
        active = [s for s in all_stats if s.is_active]
        inactive = [s for s in all_stats if not s.is_active]
        with_errors = [s for s in all_stats if s.status == "error"]
        
        total_posts = sum(s.total_posts for s in all_stats)
        total_failures = sum(s.total_failures for s in all_stats)
        total_attempts = total_posts + total_failures
        success_rate = (total_posts / total_attempts * 100) if total_attempts > 0 else 0.0
        
        return {
            "total_channels": len(all_stats),
            "active_channels": len(active),
            "inactive_channels": len(inactive),
            "channels_with_errors": len(with_errors),
            "total_posts": total_posts,
            "total_failures": total_failures,
            "success_rate": round(success_rate, 2)
        }
    
    async def initialize(self):
        """Inicializa o bot e inicia polling"""
        await self._start_polling()
    
    async def shutdown(self):
        """Desliga o bot e para polling"""
        await self.stop_posting()
        await self._stop_polling()

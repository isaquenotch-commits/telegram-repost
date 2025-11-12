"""
Handler para monitorar mensagens do canal de estoque em tempo real
"""
import logging
from typing import TYPE_CHECKING
from telegram import Update, Message
from telegram.ext import Application, MessageHandler, filters, ContextTypes

if TYPE_CHECKING:
    from backend.bot.telegram_bot import TelegramBot

logger = logging.getLogger(__name__)


async def handle_channel_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para mensagens recebidas em canais"""
    # Pega mensagem de update.message ou update.channel_post
    message = update.message or update.channel_post
    if not message:
        return
    
    chat = message.chat
    
    # Verifica se é um canal ou supergrupo
    if chat.type not in ['channel', 'supergroup']:
        return
    
    # Log para debug
    logger.info(f"Mensagem recebida do chat: {chat.type} - ID: {chat.id} - Username: {chat.username}")
    
    # Obtém instância do bot do contexto
    bot_instance = context.bot_data.get('bot_instance')
    
    if not bot_instance:
        return
    
    # Verifica se é o canal de estoque configurado
    if bot_instance.config and bot_instance.config.stock_channel:
        config_channel_id = bot_instance.config.stock_channel.channel_id
        chat_username = chat.username or None
        chat_id_str = str(chat.id)
        
        # Normaliza o ID configurado
        normalized_config_id = bot_instance._normalize_channel_id(config_channel_id)
        
        # Compara IDs do canal (username, ID numérico, ou string)
        matches = False
        
        # Tenta diferentes formas de comparação
        if isinstance(normalized_config_id, int):
            # Compara IDs numéricos diretamente
            matches = normalized_config_id == chat.id
            # Também tenta comparar com string do ID
            if not matches:
                matches = str(normalized_config_id) == chat_id_str or str(normalized_config_id) == str(chat.id)
        else:
            # Compara strings (username ou ID string)
            config_id_clean = str(normalized_config_id).lstrip('@').strip()
            
            # Tenta comparar com ID numérico do chat
            try:
                config_id_int = int(config_id_clean.lstrip('-'))
                # Se o ID configurado for negativo, tenta formatos alternativos
                if config_id_clean.startswith('-'):
                    # Compara com ID negativo
                    matches = config_id_int == chat.id or -config_id_int == chat.id
                else:
                    # Compara com ID positivo
                    matches = config_id_int == chat.id
            except ValueError:
                pass
            
            # Compara com username ou string
            if not matches:
                matches = (
                    config_id_clean == chat_username or 
                    config_id_clean == chat_id_str or
                    config_id_clean == str(chat.id) or
                    config_id_clean.lstrip('-') == str(abs(chat.id))
                )
        
        if matches:
            # Armazena a mensagem usando o ID do chat
            bot_instance.store_message(chat_id_str, message)
            logger.info(f"Mensagem armazenada do canal de estoque: {message.message_id} (Chat ID: {chat.id})")
            # Log informativo apenas para mensagens válidas
            if message.video or message.photo or message.document or message.text:
                bot_instance._log(f"📥 Nova mensagem recebida do canal de estoque (ID: {message.message_id})", "info")


def setup_message_handler(application: Application, bot_instance):
    """Configura o handler de mensagens"""
    application.bot_data['bot_instance'] = bot_instance
    
    # Adiciona handler para mensagens de canais e grupos
    # Usa UpdateType para capturar tanto message quanto channel_post
    # A função handle_channel_message já filtra por tipo de chat internamente
    application.add_handler(
        MessageHandler(
            filters.UpdateType.MESSAGE | filters.UpdateType.CHANNEL_POST,
            handle_channel_message
        )
    )
    
    logger.info("Message handler configurado")


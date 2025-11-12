from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from typing import List
from backend.models.config import Config, PostConfig, ChannelConfig, ChannelStats
from backend.bot.config_storage import save_config as persist_config, load_config as load_persisted_config
import json
from datetime import datetime

router = APIRouter(prefix="/api/config", tags=["config"])


def get_bot_instance():
    """Obtém a instância do bot (lazy import para evitar circular)"""
    from backend.api.main import bot_instance
    return bot_instance


@router.get("", response_model=Config)
async def get_config():
    """Obtém configuração atual"""
    bot_instance = get_bot_instance()
    if bot_instance and bot_instance.config:
        return bot_instance.config
    
    # Se não houver configuração em memória, tenta carregar do arquivo
    persisted_config = load_persisted_config()
    if persisted_config:
        # Carrega no bot se existir
        if bot_instance:
            bot_instance.set_config(persisted_config)
        return persisted_config
    
    return Config()


@router.post("", response_model=Config)
async def save_config(config: Config):
    """Salva configuração"""
    try:
        bot_instance = get_bot_instance()
        if bot_instance:
            bot_instance.set_config(config)
            # Persiste em arquivo
            persist_config(config)
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stock-channel")
async def set_stock_channel(channel: ChannelConfig):
    """Define canal de estoque"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            raise HTTPException(status_code=500, detail="Bot não inicializado")
        
        if not bot_instance.config:
            bot_instance.config = Config()
        
        bot_instance.config.stock_channel = channel
        # Persiste em arquivo
        persist_config(bot_instance.config)
        return {"message": "Canal de estoque configurado", "channel": channel}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/destination-channels")
async def set_destination_channels(channels: list[ChannelConfig]):
    """Define canais de destino"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            raise HTTPException(status_code=500, detail="Bot não inicializado")
        
        if not bot_instance.config:
            bot_instance.config = Config()
        
        bot_instance.config.destination_channels = channels
        # Persiste em arquivo
        persist_config(bot_instance.config)
        return {"message": "Canais de destino configurados", "channels": channels}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/post-config")
async def set_post_config(post_config: PostConfig):
    """Define configuração de postagem"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            raise HTTPException(status_code=500, detail="Bot não inicializado")
        
        if not bot_instance.config:
            bot_instance.config = Config()
        
        bot_instance.config.post_config = post_config
        # Persiste em arquivo
        persist_config(bot_instance.config)
        return {"message": "Configuração de postagem salva", "config": post_config}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/messages/{channel_id}")
async def get_messages(channel_id: str, limit: int = 100):
    """Obtém mensagens armazenadas de um canal"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            raise HTTPException(status_code=500, detail="Bot não inicializado")
        
        messages = await bot_instance.get_channel_messages(channel_id, limit)
        return {
            "channel_id": channel_id,
            "count": len(messages),
            "messages": [
                {
                    "message_id": msg.message_id,
                    "has_video": bool(msg.video),
                    "has_photo": bool(msg.photo),
                    "has_document": bool(msg.document),
                    "has_text": bool(msg.text or msg.caption),
                    "date": msg.date.isoformat() if msg.date else None
                }
                for msg in messages
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/messages/{channel_id}")
async def clear_messages(channel_id: str):
    """Limpa mensagens armazenadas de um canal"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            raise HTTPException(status_code=500, detail="Bot não inicializado")
        
        # Normaliza o ID do canal
        normalized_id = bot_instance._normalize_channel_id(channel_id)
        storage_key = str(normalized_id).lstrip('-')
        
        if storage_key in bot_instance._stored_messages:
            del bot_instance._stored_messages[storage_key]
        
        return {"message": f"Mensagens do canal {channel_id} foram limpas"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/messages")
async def clear_all_messages():
    """Limpa todas as mensagens armazenadas (fila completa)"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            raise HTTPException(status_code=500, detail="Bot não inicializado")
        
        # Limpa todas as mensagens armazenadas
        bot_instance._stored_messages.clear()
        
        return {"message": "Todas as mensagens foram limpas da fila"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/channel-stats", response_model=List[ChannelStats])
async def get_channel_stats():
    """Obtém estatísticas de todos os canais"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            return []
        
        return bot_instance.get_channel_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/channel-stats/summary")
async def get_channel_stats_summary():
    """Obtém resumo das estatísticas de canais (KPIs)"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            return {
                "total_channels": 0,
                "active_channels": 0,
                "inactive_channels": 0,
                "channels_with_errors": 0,
                "total_posts": 0,
                "total_failures": 0,
                "success_rate": 0.0
            }
        
        return bot_instance.get_channel_stats_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
async def export_config():
    """Exporta configuração completa para backup"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance or not bot_instance.config:
            # Tenta carregar do arquivo persistido
            persisted_config = load_persisted_config()
            if persisted_config:
                config = persisted_config
            else:
                config = Config()
        else:
            config = bot_instance.config
        
        # Cria objeto de backup com metadados
        backup_data = {
            "version": "1.0",
            "export_date": datetime.now().isoformat(),
            "config": config.model_dump(exclude={'status'}),  # Exclui status (não deve ser exportado)
        }
        
        # Converte para JSON
        json_str = json.dumps(backup_data, indent=2, ensure_ascii=False)
        
        # Retorna como arquivo para download
        return Response(
            content=json_str,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="telegram-repost-backup-{datetime.now().strftime("%Y%m%d-%H%M%S")}.json"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao exportar configuração: {str(e)}")


@router.post("/import")
async def import_config(file: UploadFile = File(...)):
    """Importa configuração de backup"""
    try:
        # Lê conteúdo do arquivo
        content = await file.read()
        
        # Tenta decodificar como UTF-8
        try:
            json_str = content.decode('utf-8')
        except UnicodeDecodeError:
            # Tenta outros encodings comuns
            for encoding in ['latin-1', 'cp1252', 'utf-16']:
                try:
                    json_str = content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise HTTPException(status_code=400, detail="Erro ao decodificar arquivo. Use UTF-8.")
        
        # Parse JSON
        try:
            backup_data = json.loads(json_str)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Arquivo JSON inválido: {str(e)}")
        
        # Valida estrutura
        if "config" not in backup_data:
            raise HTTPException(status_code=400, detail="Arquivo de backup inválido: campo 'config' não encontrado")
        
        # Cria objeto Config
        try:
            config_dict = backup_data["config"]
            config = Config(**config_dict)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erro ao validar configuração: {str(e)}")
        
        # Aplica configuração no bot
        bot_instance = get_bot_instance()
        if bot_instance:
            bot_instance.set_config(config)
        
        # Persiste configuração
        persist_config(config)
        
        return {
            "message": "Configuração importada com sucesso",
            "config": config.model_dump(exclude={'status'}),
            "export_date": backup_data.get("export_date"),
            "version": backup_data.get("version", "desconhecida")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao importar configuração: {str(e)}")


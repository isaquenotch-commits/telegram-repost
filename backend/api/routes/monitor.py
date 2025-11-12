"""
Rotas para monitoramento de mensagens em tempo real
"""
from fastapi import APIRouter
from telegram import Update
from telegram.ext import Application
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/monitor", tags=["monitor"])

# Aplicação do bot para monitoramento
telegram_app: Application = None


def get_bot_instance():
    """Obtém a instância do bot (lazy import para evitar circular)"""
    from backend.api.main import bot_instance
    return bot_instance


async def process_update(update: Update):
    """Processa update do Telegram"""
    if telegram_app:
        await telegram_app.process_update(update)


@router.post("/webhook")
async def webhook(update: dict):
    """Webhook para receber updates do Telegram"""
    try:
        if telegram_app:
            telegram_update = Update.de_json(update, telegram_app.bot)
            await telegram_app.process_update(telegram_update)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Erro ao processar webhook: {e}")
        return {"status": "error", "message": str(e)}


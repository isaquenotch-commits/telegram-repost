from fastapi import APIRouter, HTTPException
import asyncio

router = APIRouter(prefix="/api/control", tags=["control"])


def get_bot_instance():
    """Obtém a instância do bot (lazy import para evitar circular)"""
    from backend.api.main import bot_instance
    return bot_instance


@router.post("/start")
async def start_posting():
    """Inicia postagens"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            raise HTTPException(status_code=500, detail="Bot não inicializado")
        
        if bot_instance.status.value == "running":
            raise HTTPException(status_code=400, detail="Postagem já está em andamento")
        
        # Inicia postagem em background
        task = asyncio.create_task(bot_instance.start_posting())
        bot_instance._posting_task = task
        
        return {"message": "Postagem iniciada", "status": "running"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_posting():
    """Para postagens"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            raise HTTPException(status_code=500, detail="Bot não inicializado")
        
        await bot_instance.stop_posting()
        return {"message": "Postagem parada", "status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_status():
    """Obtém status atual"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            return {
                "status": "idle",
                "current": 0,
                "total": 0,
                "remaining_time": 0
            }
        
        return bot_instance.get_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/post-now")
async def post_now():
    """Força postagem imediata (pula delay)"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            raise HTTPException(status_code=500, detail="Bot não inicializado")
        
        if bot_instance.status.value != "running":
            raise HTTPException(status_code=400, detail="Sistema não está em execução")
        
        bot_instance.skip_next_delay()
        return {"message": "Próxima postagem será imediata", "status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-queue")
async def clear_queue():
    """Limpa todas as mensagens da fila"""
    try:
        bot_instance = get_bot_instance()
        if not bot_instance:
            raise HTTPException(status_code=500, detail="Bot não inicializado")
        
        count = bot_instance.clear_all_messages()
        return {"message": f"Fila limpa - {count} mensagem(ns) removida(s)", "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

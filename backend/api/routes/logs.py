from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from backend.models.config import LogEntry
import asyncio
import json
from typing import AsyncGenerator, List

router = APIRouter(prefix="/api/logs", tags=["logs"])


def get_queues():
    """Obtém as filas (lazy import para evitar circular)"""
    from backend.api.main import log_queue, progress_queue
    return log_queue, progress_queue


def _get_log_history_data():
    """Obtém histórico de logs (lazy import para evitar circular)"""
    from backend.api.main import log_history
    return log_history


async def log_stream() -> AsyncGenerator[str, None]:
    """Stream de logs via Server-Sent Events"""
    log_queue, progress_queue = get_queues()
    while True:
        try:
            # Verifica se há novos logs
            while not log_queue.empty():
                log_entry = await log_queue.get()
                yield f"data: {log_entry.model_dump_json()}\n\n"
            
            # Verifica progresso
            while not progress_queue.empty():
                progress = await progress_queue.get()
                yield f"data: {json.dumps({'type': 'progress', **progress})}\n\n"
            
            # Aguarda um pouco antes de verificar novamente
            await asyncio.sleep(0.5)
        except asyncio.CancelledError:
            break
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            await asyncio.sleep(1)


@router.get("/stream")
async def stream_logs():
    """Endpoint SSE para logs em tempo real"""
    return StreamingResponse(
        log_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/history", response_model=List[LogEntry])
async def get_log_history():
    """Obtém histórico de logs (últimas 1000 entradas)"""
    try:
        log_history = _get_log_history_data()
        # Retorna os últimos 1000 logs
        return list(log_history)[-1000:] if log_history else []
    except Exception as e:
        return []


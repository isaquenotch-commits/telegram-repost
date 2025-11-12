"""
Entry point para o backend FastAPI como serverless function na Vercel
"""
import os
import sys
from pathlib import Path

# Adiciona o diretório backend ao path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))
sys.path.insert(0, str(Path(__file__).parent.parent))

# Importa a aplicação FastAPI
from backend.api.main import app

# Handler para a Vercel (usa ASGI)
# A Vercel automaticamente detecta aplicações FastAPI e usa Mangum
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except ImportError:
    # Fallback se mangum não estiver disponível
    # A Vercel pode usar o app diretamente em alguns casos
    handler = app


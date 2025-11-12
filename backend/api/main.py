import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from backend.bot.telegram_bot import TelegramBot
from backend.models.config import LogEntry
from backend.api.routes import config_router, control_router, logs_router

# Tenta carregar o .env com diferentes encodings
def load_env_with_encoding():
    """Carrega o arquivo .env tentando diferentes encodings"""
    # Tenta encontrar o arquivo .env em diferentes locais
    possible_paths = [
        Path('.env'),  # Diretório atual
        Path('..') / '.env',  # Diretório pai
        Path('backend') / '.env',  # Diretório backend
    ]
    
    env_path = None
    for path in possible_paths:
        if path.exists():
            env_path = path.resolve()  # Resolve para caminho absoluto
            break
    
    if not env_path:
        # Se não encontrou, tenta carregar normalmente (pode não existir)
        try:
            load_dotenv()
            return
        except Exception:
            return
    
    # Detecta o encoding lendo os primeiros bytes
    try:
        with open(env_path, 'rb') as f:
            raw_bytes = f.read(4)
    except Exception:
        return
    
    # Detecta encoding baseado nos primeiros bytes
    detected_encoding = None
    if len(raw_bytes) >= 2:
        if raw_bytes[:2] == b'\xff\xfe':
            detected_encoding = 'utf-16-le'
        elif raw_bytes[:2] == b'\xfe\xff':
            detected_encoding = 'utf-16-be'
        elif len(raw_bytes) >= 3 and raw_bytes[:3] == b'\xef\xbb\xbf':
            detected_encoding = 'utf-8'
        elif raw_bytes[0] == 0xff:
            detected_encoding = 'utf-16'
    
    # Lista de encodings para tentar (começa com o detectado)
    encodings = []
    if detected_encoding:
        encodings.append(detected_encoding)
    encodings.extend(['utf-8', 'utf-16', 'utf-16-le', 'utf-16-be', 'latin-1', 'cp1252'])
    # Remove duplicatas mantendo ordem
    encodings = list(dict.fromkeys(encodings))
    
    for encoding in encodings:
        try:
            # Lê o arquivo com o encoding especificado
            with open(env_path, 'r', encoding=encoding) as f:
                content = f.read()
            
            # Se conseguiu ler, salva em UTF-8 e carrega
            if encoding != 'utf-8':
                # Converte para UTF-8
                with open(env_path, 'w', encoding='utf-8', newline='') as f:
                    f.write(content)
            
            # Carrega o arquivo usando dotenv_values para evitar problemas
            from dotenv import dotenv_values
            env_vars = dotenv_values(env_path)
            for key, value in env_vars.items():
                if value is not None:
                    os.environ[key] = value
            
            return
        except (UnicodeDecodeError, UnicodeError):
            continue
        except Exception:
            continue
    
    # Se nenhum encoding funcionou, tenta carregar normalmente
    try:
        load_dotenv(env_path)
    except Exception:
        pass

# Carrega variáveis de ambiente
load_env_with_encoding()

# Cria aplicação FastAPI
app = FastAPI(title="Telegram Bot Repost API")

# Configura CORS
# Permite origens do localhost e da Vercel
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
# Adiciona origem da Vercel se estiver definida
vercel_url = os.getenv("VERCEL_URL")
if vercel_url:
    allowed_origins.append(f"https://{vercel_url}")
# Adiciona domínio customizado se estiver definido
custom_domain = os.getenv("NEXT_PUBLIC_VERCEL_URL")
if custom_domain:
    allowed_origins.append(f"https://{custom_domain}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instância global do bot
bot_instance: TelegramBot | None = None

# Filas para logs e progresso
log_queue: asyncio.Queue = None
progress_queue: asyncio.Queue = None

# Histórico de logs (persistente durante execução)
log_history: list[LogEntry] = []


def log_callback(log_entry: LogEntry):
    """Callback para adicionar logs na fila e histórico"""
    global log_history
    
    # Adiciona ao histórico (mantém últimos 1000)
    log_history.append(log_entry)
    if len(log_history) > 1000:
        log_history = log_history[-1000:]
    
    if log_queue is None:
        return
    try:
        # Tenta adicionar à fila de forma thread-safe
        try:
            loop = asyncio.get_running_loop()
            # Se já estiver em um loop, cria uma task
            asyncio.run_coroutine_threadsafe(log_queue.put(log_entry), loop)
        except RuntimeError:
            # Se não houver loop rodando, cria um novo
            try:
                loop = asyncio.get_event_loop()
                if loop.is_closed():
                    raise RuntimeError("Loop fechado")
                loop.call_soon_threadsafe(lambda: asyncio.create_task(log_queue.put(log_entry)))
            except:
                # Último recurso: usa threading
                import threading
                def put_log():
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    new_loop.run_until_complete(log_queue.put(log_entry))
                    new_loop.close()
                threading.Thread(target=put_log, daemon=True).start()
    except Exception as e:
        print(f"Erro ao adicionar log à fila: {e}")


def progress_callback(progress: dict):
    """Callback para adicionar progresso na fila"""
    if progress_queue is None:
        return
    try:
        try:
            loop = asyncio.get_running_loop()
            asyncio.run_coroutine_threadsafe(progress_queue.put(progress), loop)
        except RuntimeError:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_closed():
                    raise RuntimeError("Loop fechado")
                loop.call_soon_threadsafe(lambda: asyncio.create_task(progress_queue.put(progress)))
            except:
                import threading
                def put_progress():
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    new_loop.run_until_complete(progress_queue.put(progress))
                    new_loop.close()
                threading.Thread(target=put_progress, daemon=True).start()
    except Exception as e:
        print(f"Erro ao adicionar progresso à fila: {e}")


@app.on_event("startup")
async def startup_event():
    """Inicializa o bot ao iniciar a aplicação"""
    global bot_instance, log_queue, progress_queue, log_history
    
    # Inicializa filas
    log_queue = asyncio.Queue()
    progress_queue = asyncio.Queue()
    log_history = []
    
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not token:
        print("AVISO: TELEGRAM_BOT_TOKEN não encontrado. Bot não será inicializado.")
        return
    
    try:
        bot_instance = TelegramBot(token=token)
        bot_instance.set_log_callback(log_callback)
        bot_instance.set_progress_callback(progress_callback)
        
        # Carrega configuração persistida se existir
        from backend.bot.config_storage import load_config as load_persisted_config
        persisted_config = load_persisted_config()
        if persisted_config:
            bot_instance.set_config(persisted_config)
            print("Configuração persistida carregada com sucesso!")
        
        # Inicializa polling em background
        asyncio.create_task(bot_instance.initialize())
        print("Bot Telegram inicializado com sucesso!")
    except Exception as e:
        print(f"Erro ao inicializar bot: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Para o bot ao desligar a aplicação"""
    global bot_instance
    if bot_instance:
        await bot_instance.shutdown()


# Registra rotas
app.include_router(config_router)
app.include_router(control_router)
app.include_router(logs_router)


@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "message": "Telegram Bot Repost API",
        "status": "running",
        "bot_initialized": bot_instance is not None
    }


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy"}


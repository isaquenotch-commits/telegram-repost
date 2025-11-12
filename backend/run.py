import uvicorn
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Adiciona o diretório pai ao path para permitir imports do módulo backend
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

# Tenta carregar o .env com diferentes encodings
def load_env_with_encoding():
    """Carrega o arquivo .env tentando diferentes encodings"""
    # Tenta encontrar o arquivo .env em diferentes locais
    possible_paths = [
        Path('.env'),  # Diretório atual (backend)
        Path('..') / '.env',  # Diretório pai
        parent_dir / '.env',  # Diretório pai (absoluto)
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
        except Exception as e:
            # Ignora se não existir
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
                print(f"Convertendo arquivo .env de {encoding} para UTF-8...")
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
        except Exception as e:
            # Se der outro erro, tenta o próximo encoding
            continue
    
    # Se nenhum encoding funcionou, tenta carregar normalmente
    try:
        load_dotenv(env_path)
    except Exception as e:
        print(f"Erro ao carregar .env (tentando ignorar): {e}")

load_env_with_encoding()

if __name__ == "__main__":
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run(
        "backend.api.main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )


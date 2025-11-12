"""
Sistema de persistência de configurações usando arquivo JSON
"""
import json
import logging
from pathlib import Path
from typing import Optional
from backend.models.config import Config

logger = logging.getLogger(__name__)


def get_config_path() -> Path:
    """Retorna o caminho do arquivo de configuração"""
    # Obtém o diretório do arquivo atual (backend/bot/config_storage.py)
    current_file = Path(__file__)
    # Vai para backend/config.json
    backend_dir = current_file.parent.parent
    config_path = backend_dir / "config.json"
    
    # Garante que o diretório existe
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    return config_path.resolve()


def save_config(config: Config) -> bool:
    """Salva configuração em arquivo JSON"""
    try:
        config_path = get_config_path()
        
        # Cria diretório se não existir
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Converte para dict, excluindo status (não deve ser persistido)
        config_dict = config.model_dump(exclude={'status'})
        
        # Salva em JSON
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config_dict, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Configuração salva em {config_path}")
        return True
    except Exception as e:
        logger.error(f"Erro ao salvar configuração: {e}")
        return False


def load_config() -> Optional[Config]:
    """Carrega configuração do arquivo JSON"""
    try:
        config_path = get_config_path()
        
        if not config_path.exists():
            logger.info("Arquivo de configuração não encontrado, usando padrão")
            return None
        
        # Lê arquivo JSON
        with open(config_path, 'r', encoding='utf-8') as f:
            config_dict = json.load(f)
        
        # Cria objeto Config
        config = Config(**config_dict)
        logger.info(f"Configuração carregada de {config_path}")
        return config
    except Exception as e:
        logger.error(f"Erro ao carregar configuração: {e}")
        return None


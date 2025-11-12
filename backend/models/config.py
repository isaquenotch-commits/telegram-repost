from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from enum import Enum


class PostStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    STOPPED = "stopped"
    COMPLETED = "completed"


class ChannelConfig(BaseModel):
    channel_id: str = Field(..., description="ID do canal (ex: @estoque)")
    name: str = Field(..., description="Nome do canal")


class PostConfig(BaseModel):
    template_text: str = Field(default="", description="Texto padrão do post")
    button_label: Optional[str] = Field(default=None, description="Label do botão")
    button_url: Optional[str] = Field(default=None, description="URL do botão")
    delay_min: int = Field(default=3600, ge=1, description="Delay mínimo em segundos")
    delay_max: int = Field(default=3600, ge=1, description="Delay máximo em segundos")

    @model_validator(mode='after')
    def validate_delay_range(self):
        """Valida que delay_max >= delay_min"""
        if self.delay_max < self.delay_min:
            raise ValueError(f"delay_max ({self.delay_max}) deve ser maior ou igual a delay_min ({self.delay_min})")
        return self


class Config(BaseModel):
    stock_channel: Optional[ChannelConfig] = Field(default=None, description="Canal de estoque")
    destination_channels: List[ChannelConfig] = Field(default_factory=list, description="Canais de destino")
    post_config: PostConfig = Field(default_factory=PostConfig, description="Configuração de postagem")
    status: PostStatus = Field(default=PostStatus.IDLE, description="Status atual")


class LogEntry(BaseModel):
    timestamp: str
    message: str
    level: str = "info"  # info, success, error, warning


class PostProgress(BaseModel):
    current: int = 0
    total: int = 0
    remaining_time: int = 0  # em segundos
    status: PostStatus = PostStatus.IDLE


class ChannelStats(BaseModel):
    """Estatísticas de um canal"""
    channel_id: str
    name: str
    total_posts: int = 0  # Total de postagens bem-sucedidas
    total_failures: int = 0  # Total de falhas
    last_post_date: Optional[str] = None  # ISO format
    last_failure_date: Optional[str] = None  # ISO format
    is_active: bool = True  # Se o canal está ativo (configurado e selecionado)
    status: str = "unknown"  # "active", "inactive", "error", "unknown"

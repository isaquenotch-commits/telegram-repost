from .config import router as config_router
from .control import router as control_router
from .logs import router as logs_router

__all__ = ["config_router", "control_router", "logs_router"]


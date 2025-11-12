@echo off
echo ========================================
echo   Telegram Repost - Iniciando Sistema
echo ========================================
echo.

REM Verifica se o venv existe
if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERRO] Ambiente virtual do backend nao encontrado!
    echo Execute: cd backend ^&^& python -m venv venv
    pause
    exit /b 1
)

REM Verifica se node_modules existe
if not exist "frontend\node_modules" (
    echo [AVISO] node_modules nao encontrado! Instalando dependencias...
    cd frontend
    call npm install
    cd ..
)

echo [1/2] Iniciando Backend (porta 8000)...
start "Backend - Telegram Repost" cmd /k "cd backend && venv\Scripts\activate && python run.py"

REM Aguarda um pouco para o backend iniciar
timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend (porta 3000)...
start "Frontend - Telegram Repost" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Sistema iniciado com sucesso!
echo ========================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo.
echo   Pressione qualquer tecla para fechar esta janela...
echo   (Os servidores continuarao rodando nas outras janelas)
pause >nul




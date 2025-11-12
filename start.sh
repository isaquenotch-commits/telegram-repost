#!/bin/bash

echo "========================================"
echo "  Telegram Repost - Iniciando Sistema"
echo "========================================"
echo ""

# Verifica se o venv existe
if [ ! -d "backend/venv" ]; then
    echo "[ERRO] Ambiente virtual do backend não encontrado!"
    echo "Execute: cd backend && python3 -m venv venv"
    exit 1
fi

# Verifica se node_modules existe
if [ ! -d "frontend/node_modules" ]; then
    echo "[AVISO] node_modules não encontrado! Instalando dependências..."
    cd frontend
    npm install
    cd ..
fi

echo "[1/2] Iniciando Backend (porta 8000)..."
cd backend
source venv/bin/activate
python run.py &
BACKEND_PID=$!
cd ..

# Aguarda um pouco para o backend iniciar
sleep 3

echo "[2/2] Iniciando Frontend (porta 3000)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "  Sistema iniciado com sucesso!"
echo "========================================"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo ""
echo "  PIDs: Backend=$BACKEND_PID, Frontend=$FRONTEND_PID"
echo "  Pressione Ctrl+C para parar ambos os servidores"
echo ""

# Função para limpar processos ao sair
cleanup() {
    echo ""
    echo "Parando servidores..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Aguarda indefinidamente
wait




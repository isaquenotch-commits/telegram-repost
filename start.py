#!/usr/bin/env python3
"""
Script para iniciar Backend e Frontend simultaneamente
"""
import subprocess
import sys
import os
import time
import signal
from pathlib import Path

# Cores para output (opcional)
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header():
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*50}")
    print("  Telegram Repost - Iniciando Sistema")
    print(f"{'='*50}{Colors.ENDC}\n")

def check_dependencies():
    """Verifica se as dependências estão instaladas"""
    issues = []
    
    # Verifica venv do backend
    venv_path = Path("backend/venv")
    if not venv_path.exists():
        issues.append("Ambiente virtual do backend não encontrado!\n"
                     "  Execute: cd backend && python -m venv venv")
    
    # Verifica node_modules do frontend
    node_modules = Path("frontend/node_modules")
    if not node_modules.exists():
        print(f"{Colors.WARNING}[AVISO] node_modules não encontrado!{Colors.ENDC}")
        print("Instalando dependências do frontend...")
        try:
            subprocess.run(["npm", "install"], cwd="frontend", check=True)
            print(f"{Colors.OKGREEN}✓ Dependências instaladas!{Colors.ENDC}\n")
        except subprocess.CalledProcessError:
            issues.append("Erro ao instalar dependências do frontend")
    
    if issues:
        print(f"{Colors.FAIL}[ERRO] Problemas encontrados:{Colors.ENDC}")
        for issue in issues:
            print(f"  - {issue}")
        return False
    
    return True

def start_backend():
    """Inicia o backend"""
    print(f"{Colors.OKCYAN}[1/2] Iniciando Backend (porta 8000)...{Colors.ENDC}")
    
    # Determina o comando Python baseado no OS
    if sys.platform == "win32":
        python_cmd = str(Path("backend/venv/Scripts/python.exe"))
        activate_cmd = str(Path("backend/venv/Scripts/activate.bat"))
    else:
        python_cmd = str(Path("backend/venv/bin/python"))
        activate_cmd = str(Path("backend/venv/bin/activate"))
    
    # Inicia o backend
    if sys.platform == "win32":
        # Windows
        process = subprocess.Popen(
            [python_cmd, "run.py"],
            cwd="backend",
            creationflags=subprocess.CREATE_NEW_CONSOLE if hasattr(subprocess, 'CREATE_NEW_CONSOLE') else 0
        )
    else:
        # Linux/Mac
        process = subprocess.Popen(
            [python_cmd, "run.py"],
            cwd="backend",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    
    return process

def start_frontend():
    """Inicia o frontend"""
    print(f"{Colors.OKCYAN}[2/2] Iniciando Frontend (porta 3000)...{Colors.ENDC}")
    
    if sys.platform == "win32":
        # Windows
        process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd="frontend",
            creationflags=subprocess.CREATE_NEW_CONSOLE if hasattr(subprocess, 'CREATE_NEW_CONSOLE') else 0
        )
    else:
        # Linux/Mac
        process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd="frontend",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    
    return process

def main():
    print_header()
    
    # Verifica dependências
    if not check_dependencies():
        sys.exit(1)
    
    processes = []
    
    try:
        # Inicia backend
        backend_process = start_backend()
        processes.append(("Backend", backend_process))
        
        # Aguarda um pouco para o backend iniciar
        time.sleep(3)
        
        # Inicia frontend
        frontend_process = start_frontend()
        processes.append(("Frontend", frontend_process))
        
        print(f"\n{Colors.OKGREEN}{Colors.BOLD}{'='*50}")
        print("  Sistema iniciado com sucesso!")
        print(f"{'='*50}{Colors.ENDC}")
        print(f"{Colors.OKBLUE}  Backend:  http://localhost:8000{Colors.ENDC}")
        print(f"{Colors.OKBLUE}  Frontend: http://localhost:3000{Colors.ENDC}")
        print(f"\n{Colors.WARNING}Pressione Ctrl+C para parar ambos os servidores{Colors.ENDC}\n")
        
        # Aguarda indefinidamente
        while True:
            time.sleep(1)
            # Verifica se algum processo terminou
            for name, proc in processes:
                if proc.poll() is not None:
                    print(f"{Colors.FAIL}[ERRO] {name} parou inesperadamente!{Colors.ENDC}")
                    # Para todos os processos
                    cleanup(processes)
                    sys.exit(1)
    
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}Parando servidores...{Colors.ENDC}")
        cleanup(processes)
        print(f"{Colors.OKGREEN}Servidores parados!{Colors.ENDC}")

def cleanup(processes):
    """Para todos os processos"""
    for name, proc in processes:
        try:
            if sys.platform == "win32":
                proc.terminate()
            else:
                proc.terminate()
                proc.wait(timeout=5)
        except:
            try:
                proc.kill()
            except:
                pass

if __name__ == "__main__":
    main()




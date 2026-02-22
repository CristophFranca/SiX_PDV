#!/bin/bash

echo ""
echo " ================================================"
echo "  SiX PDV — Iniciando sistema..."
echo " ================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Verifica Python
if ! command -v python3 &> /dev/null; then
    echo " ERRO: Python 3 não encontrado."
    echo " Instale com: sudo apt install python3 python3-pip"
    exit 1
fi

# Instala dependências se necessário
if [ ! -f ".deps_ok" ]; then
    echo " Instalando dependências..."
    pip3 install -r requirements.txt --quiet
    if [ $? -eq 0 ]; then
        touch .deps_ok
        echo " Dependências instaladas!"
    else
        echo " ERRO ao instalar dependências."
        exit 1
    fi
fi

# Abre navegador
sleep 2 && xdg-open http://localhost:5000 2>/dev/null &

echo " Sistema rodando em http://localhost:5000"
echo " Pressione Ctrl+C para parar."
echo ""

python3 run.py

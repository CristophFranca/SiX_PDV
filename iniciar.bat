@echo off
title SiX PDV
color 0A
cd /d %~dp0
echo.
echo  ================================================
echo   SiX PDV - Iniciando sistema...
echo  ================================================
echo.

:: Verifica se Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERRO: Python nao encontrado.
    echo  Instale o Python em https://python.org/downloads
    echo  e marque a opcao "Add Python to PATH"
    pause
    exit /b 1
)

:: Instala dependências se necessário
if not exist "%~dp0.deps_ok" (
    echo  Instalando dependencias...
    pip install -r requirements.txt --quiet
    if %errorlevel% equ 0 (
        echo. > "%~dp0.deps_ok"
        echo  Dependencias instaladas com sucesso!
    ) else (
        echo  ERRO ao instalar dependencias.
        pause
        exit /b 1
    )
)

:: Abre o navegador após 3 segundos
echo  Abrindo navegador em http://localhost:5000 ...
ping -n 3 127.0.0.1 >nul
start "" http://localhost:5000

:: Inicia o servidor
echo  Sistema rodando em http://localhost:5000
echo  Feche esta janela para parar o sistema.
echo.
python run.py
pause

# SiX PDV — Guia de Instalação Local

Sistema de ponto de venda e gestão de estoque para uso em loja.  
Desenvolvido em Python (Flask) + SQLite. Não requer internet após instalado.

---

## Requisitos

| Item | Versão mínima |
|------|--------------|
| Python | 3.10 ou superior |
| pip | incluído com Python |
| Sistema operacional | Windows 10/11 ou Linux Ubuntu 20+ |

---

## 1. Instalar o Python (Windows)

1. Acesse **https://python.org/downloads**
2. Baixe a versão mais recente (ex: Python 3.12)
3. Execute o instalador
4. **IMPORTANTE:** Marque a opção **"Add Python to PATH"** antes de clicar em Install
5. Clique em "Install Now"
6. Após instalar, abra o **Prompt de Comando** (`Win + R` → digita `cmd`) e teste:
   ```
   python --version
   ```
   Deve aparecer algo como `Python 3.12.x`

---

## 2. Copiar os arquivos do sistema

Copie a pasta `six/` para um local permanente no computador.  
Sugestão: `C:\SiXPDV\` no Windows ou `/opt/sixpdv/` no Linux.

Exemplo Windows:
```
C:\SiXPDV\
├── run.py
├── app\
├── static\
├── templates\
├── data\
└── requirements.txt
```

---

## 3. Instalar dependências

Abra o **Prompt de Comando** dentro da pasta do sistema:

**Windows:**
1. Abra o Explorer, navegue até `C:\SiXPDV\`
2. Clique na barra de endereço do Explorer, digite `cmd` e pressione Enter
3. No terminal que abrir, execute:
```bash
pip install -r requirements.txt
```

**Linux:**
```bash
cd /opt/sixpdv
pip3 install -r requirements.txt
```

Aguarde a instalação. Deve aparecer `Successfully installed flask werkzeug`.

---

## 4. Configurar (opcional)

Copie o arquivo `.env.example` para `.env`:

**Windows:** `copy .env.example .env`  
**Linux:** `cp .env.example .env`

Edite o `.env` com o Bloco de Notas (Windows) ou qualquer editor:

```
# Chave de segurança — troque por qualquer texto longo aleatório
SIX_SECRET=minha-chave-super-secreta-2025

# E-mail de alertas (opcional — deixe MAIL_ENABLED=false para desativar)
MAIL_ENABLED=false
```

> Se não criar o `.env`, o sistema funciona normalmente com configurações padrão.

---

## 5. Iniciar o sistema

**Windows:**
```bash
python run.py
```

**Linux:**
```bash
python3 run.py
```

Na primeira execução, o sistema irá:
- Criar o banco de dados (`data/six.db`)
- Importar os 85 produtos do catálogo
- Criar o usuário administrador

Você verá no terminal:
```
[SiX PDV] Admin criado: admin@six.local / admin123
[SiX PDV] 85 produtos importados.
[SiX PDV] Banco: C:\SiXPDV\data\six.db
================================================
  SiX PDV — http://localhost:5000
  Login: admin@six.local / admin123
================================================
```

---

## 6. Acessar o sistema

Abra o navegador (Chrome, Edge ou Firefox) e acesse:

```
http://localhost:5000
```

**Credenciais padrão:**
- E-mail: `admin@six.local`
- Senha: `admin123`

> **IMPORTANTE:** Troque a senha do admin imediatamente após o primeiro acesso.  
> Vá em Usuários → edite o administrador → altere a senha.

---

## 7. Criar atalho na Área de Trabalho (Windows)

Para iniciar o sistema com duplo clique:

1. Crie um arquivo `iniciar.bat` dentro da pasta `C:\SiXPDV\` com o conteúdo:
```bat
@echo off
cd /d C:\SiXPDV
start "" http://localhost:5000
python run.py
pause
```

2. Clique com o botão direito → "Enviar para" → "Área de trabalho (criar atalho)"
3. Agora basta dar duplo clique no atalho para iniciar o sistema e abrir o navegador.

---

## 8. Iniciar automaticamente com o Windows (opcional)

Para que o SiX PDV inicie junto com o Windows:

1. Pressione `Win + R`, digite `shell:startup` e pressione Enter
2. Copie o arquivo `iniciar.bat` para essa pasta
3. Pronto — o sistema iniciará automaticamente no login

---

## 9. Backup dos dados

Todos os dados ficam no arquivo:
```
data/six.db
```

**Para fazer backup:**
- Copie o arquivo `six.db` para um pendrive, Google Drive ou outra pasta
- Faça isso diariamente ou semanalmente

**Para restaurar:**
- Pare o sistema (feche o terminal)
- Substitua o `six.db` pelo arquivo de backup
- Inicie o sistema novamente

---

## Solução de problemas

### "python" não é reconhecido
→ Python não foi adicionado ao PATH durante a instalação.  
Reinstale o Python e marque a opção "Add Python to PATH".

### Porta 5000 ocupada
→ Algum outro programa está usando a porta 5000.  
Edite o `run.py` e mude `port=5000` para `port=5001` (ou outra porta livre).  
Acesse então `http://localhost:5001`.

### Banco de dados corrompido
→ Pare o sistema, delete o arquivo `data/six.db` e reinicie.  
O banco será recriado do zero (os produtos voltam, mas movimentações e vendas são perdidos).  
**Por isso é essencial fazer backup regularmente.**

### Sistema lento
→ SQLite tem limite de ~100 usuários simultâneos — para uso em uma única máquina, é mais do que suficiente.

---

## Informações técnicas

| Item | Valor |
|------|-------|
| Linguagem | Python 3.x |
| Framework | Flask 3.x |
| Banco de dados | SQLite 3 |
| Porta padrão | 5000 |
| Dados | `data/six.db` |
| Produtos iniciais | `data/produtos.json` |
| Logs | Terminal (stdout) |

---

*SiX PDV — Sistema desenvolvido para uso interno.*

<div align="center">

# SiX PDV

**Sistema de Ponto de Venda e Gestão de Estoque**

*Leve • Rápido • Sem dependência de internet*

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/Licença-MIT-green?style=flat-square)](LICENSE)

</div>

---

## Sobre

SiX PDV é um sistema de gestão de estoque e ponto de venda desenvolvido para pequenos comércios. Roda 100% localmente — sem mensalidade, sem nuvem, sem internet após instalado. Basta um computador com Python.

Desenvolvido em Python com Flask no backend e HTML/CSS/JS vanilla no frontend. Banco de dados SQLite — zero configuração de servidor.

---

## Funcionalidades

### Estoque
- Cadastro completo de produtos com código, EAN, categoria, unidade, preços de custo e venda
- Controle de quantidade mínima e máxima com alertas automáticos
- Status visual por cor: Normal, Estoque Baixo, Crítico, Zerado
- Movimentações de entrada, saída e ajuste com histórico
- Busca por nome, código ou EAN (com scanner de código de barras via câmera)
- Filtros por categoria, unidade e status
- Ordenação por qualquer coluna
- Requisição de materiais com impressão formatada e débito automático no estoque
- Exportação CSV completa
- Alertas por e-mail (configurável)

### Caixa / PDV
- Grade de produtos para venda com um clique
- Carrinho com controle de quantidade e remoção de itens
- Desconto por venda
- Pagamento em dinheiro (com cálculo de troco), PIX, cartão débito e crédito
- Abertura e fechamento de caixa com saldo inicial e relatório final
- Impressão de cupom de venda
- Histórico de vendas com filtro por data

### Dashboard
- KPIs em tempo real: total de SKUs, faturamento do dia, vendas por forma de pagamento
- Gráfico de distribuição de status do estoque (donut)
- Gráfico de itens por categoria
- Gráfico de movimentações dos últimos 14 dias
- Lista de produtos em situação crítica
- Feed de movimentações recentes
- Auto-atualização a cada 60 segundos

### Administração
- Controle de usuários com perfis **Admin** e **Operador**
- Tema claro e escuro (salvo por usuário)
- Catálogo inicial com 85 produtos pré-cadastrados com preços de mercado

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.10+ · Flask 3.x |
| Banco de dados | SQLite 3 (WAL mode) |
| Frontend | HTML5 · CSS3 · JavaScript (vanilla) |
| Gráficos | Chart.js 4.x |
| Fontes | DM Sans · DM Mono (Google Fonts) |

---

## Estrutura do projeto

```
six/
├── run.py                      # Ponto de entrada
├── requirements.txt
├── .env.example                # Variáveis de configuração
├── iniciar.bat                 # Atalho Windows
├── iniciar.sh                  # Atalho Linux
│
├── app/
│   ├── __init__.py             # Factory do Flask
│   ├── db.py                   # Banco, schema e helpers
│   ├── auth.py                 # Decorators de sessão
│   ├── mail.py                 # Alertas por e-mail
│   │
│   ├── api/                    # Blueprint /api/*
│   │   ├── auth.py             # POST /login · /logout · GET /me
│   │   ├── produtos.py         # CRUD /produtos
│   │   ├── movimentacoes.py    # POST /movimentacoes
│   │   ├── usuarios.py         # CRUD /usuarios (admin)
│   │   ├── dashboard.py        # GET /dashboard (KPIs + charts)
│   │   ├── caixa.py            # PDV completo
│   │   └── export.py           # CSV produtos e vendas
│   │
│   └── views/
│       └── pages.py            # Rotas HTML
│
├── static/
│   ├── css/
│   │   ├── base.css            # Design system (tokens, componentes)
│   │   ├── layout.css          # Sidebar, tabela, drawer
│   │   └── pages/
│   │       ├── dashboard.css
│   │       └── caixa.css
│   └── js/
│       ├── core.js             # API fetch, toast, tema, relógio
│       ├── estoque.js          # Tabela, filtros, modais, scanner
│       ├── dashboard.js        # Charts, KPIs, feed
│       └── caixa.js            # PDV, carrinho, pagamento, cupom
│
├── templates/
│   ├── base.html               # Layout base (topbar, sidebar)
│   ├── login.html
│   ├── estoque.html
│   ├── dashboard.html
│   └── caixa.html
│
└── data/
    ├── produtos.json           # Catálogo inicial (85 produtos)
    └── six.db                  # Gerado automaticamente
```

---

## Instalação

### Pré-requisitos

- [Python 3.10+](https://python.org/downloads) — durante a instalação no Windows, marque **"Add Python to PATH"**

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/six-pdv.git
cd six-pdv

# 2. Instale as dependências
pip install -r requirements.txt

# 3. (Opcional) Configure o ambiente
cp .env.example .env
# edite o .env conforme necessário

# 4. Inicie o sistema
python run.py
```

Acesse **http://localhost:5000** no navegador.

**Credenciais padrão:**
```
E-mail: admin@six.local
Senha:  admin123
```

> ⚠️ Troque a senha do administrador imediatamente após o primeiro acesso.

### Windows — atalho rápido

Após clonar/extrair os arquivos, basta dar **duplo clique em `iniciar.bat`**.  
O script instala as dependências automaticamente, abre o navegador e inicia o servidor.

---

## Configuração

Copie `.env.example` para `.env` e edite:

```env
# Chave de segurança da sessão (troque por um valor aleatório longo)
SIX_SECRET=troque-por-um-valor-secreto-aqui

# Alertas por e-mail (opcional)
MAIL_ENABLED=false
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=seu@email.com
MAIL_PASS=sua-senha-de-app
MAIL_FROM=SiX PDV <seu@email.com>
MAIL_TO=destino@email.com
```

Se o `.env` não existir, o sistema roda normalmente com valores padrão.

---

## Banco de dados

Todos os dados ficam em `data/six.db` (SQLite).

**Backup:** copie o arquivo `six.db` para um local seguro.  
**Restaurar:** pare o sistema, substitua o `six.db` e reinicie.

### Schema resumido

| Tabela | Descrição |
|--------|-----------|
| `usuarios` | Contas com perfil admin ou operador |
| `produtos` | Catálogo com preços, quantidades e alertas |
| `movimentacoes` | Histórico de entradas, saídas e ajustes |
| `caixas` | Sessões de abertura e fechamento do caixa |
| `vendas` | Cabeçalho das vendas com pagamento e totais |
| `venda_itens` | Itens de cada venda |
| `alertas_log` | Controle anti-spam dos e-mails de alerta |

---

## API

O sistema expõe uma API REST em `/api/*` consumida pelo próprio frontend.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Autenticação |
| POST | `/api/auth/logout` | Encerrar sessão |
| GET | `/api/produtos` | Listar produtos (filtros, sort, KPIs) |
| POST | `/api/produtos` | Criar produto |
| PUT | `/api/produtos/:id` | Atualizar produto |
| DELETE | `/api/produtos/:id` | Remover produto |
| POST | `/api/movimentacoes` | Registrar movimentação |
| GET | `/api/dashboard` | KPIs e dados dos gráficos |
| GET | `/api/caixa/status` | Status do caixa atual |
| POST | `/api/caixa/abrir` | Abrir caixa |
| POST | `/api/caixa/fechar` | Fechar caixa |
| POST | `/api/caixa/venda` | Registrar venda |
| GET | `/api/caixa/vendas` | Histórico de vendas |
| GET | `/api/export/produtos` | Exportar produtos em CSV |
| GET | `/api/export/vendas` | Exportar vendas em CSV |
| GET | `/api/usuarios` | Listar usuários (admin) |
| POST | `/api/usuarios` | Criar usuário (admin) |

---

## Screenshots

> *Interface no tema escuro — estoque com filtros, sidebar de KPIs e coluna EAN*

> *PDV com grade de produtos, carrinho e seleção de forma de pagamento*

> *Dashboard com gráficos de movimentações, distribuição de status e feed em tempo real*

---

## Roadmap

- [ ] Relatório mensal de vendas em PDF
- [ ] Suporte a múltiplos operadores simultâneos (PostgreSQL)
- [ ] Layout responsivo para tablet
- [ ] Integração com impressora térmica (ESC/POS)
- [ ] Controle de lotes e validade
- [ ] Importação de produtos via planilha CSV

---

## Licença

Distribuído sob a licença MIT. Veja [`LICENSE`](LICENSE) para mais informações.

---

<div align="center">
  <sub>Desenvolvido para uso em pequenos comércios · Python + Flask + SQLite</sub>
</div>

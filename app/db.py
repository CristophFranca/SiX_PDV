"""
SiX PDV — Camada de banco de dados
SQLite com WAL mode, foreign keys, seed automático.
"""
import json
import os
import sqlite3

from flask import g
from werkzeug.security import generate_password_hash

BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH   = os.path.join(BASE_DIR, "data", "six.db")
SEED_PATH = os.path.join(BASE_DIR, "data", "produtos.json")


# ── Conexão por request ───────────────────────────────────────

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


def close_db(exc=None):
    db = g.pop("db", None)
    if db:
        db.close()


# ── Schema ────────────────────────────────────────────────────

SCHEMA = """
CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nome          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    senha_hash    TEXT    NOT NULL,
    perfil        TEXT    NOT NULL DEFAULT 'operador'
                  CHECK(perfil IN ('admin','operador')),
    ativo         INTEGER NOT NULL DEFAULT 1,
    criado_em     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    ultimo_acesso TEXT
);

CREATE TABLE IF NOT EXISTS produtos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo        TEXT    NOT NULL UNIQUE,
    ean           TEXT    DEFAULT '',
    descricao     TEXT    NOT NULL,
    categoria     TEXT    NOT NULL DEFAULT 'Geral',
    unidade       TEXT    NOT NULL DEFAULT 'UN',
    preco_custo   REAL    NOT NULL DEFAULT 0.0,
    preco_venda   REAL    NOT NULL DEFAULT 0.0,
    quantidade    INTEGER NOT NULL DEFAULT 0,
    minimo        INTEGER NOT NULL DEFAULT 0,
    maximo        INTEGER NOT NULL DEFAULT 0,
    criado_em     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    atualizado_em TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS movimentacoes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id  INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    usuario_id  INTEGER REFERENCES usuarios(id),
    tipo        TEXT    NOT NULL CHECK(tipo IN ('entrada','saida','ajuste')),
    quantidade  INTEGER NOT NULL,
    observacao  TEXT    DEFAULT '',
    criado_em   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS caixas (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id    INTEGER REFERENCES usuarios(id),
    status        TEXT    NOT NULL DEFAULT 'aberto' CHECK(status IN ('aberto','fechado')),
    saldo_inicial REAL    NOT NULL DEFAULT 0.0,
    saldo_final   REAL,
    aberto_em     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    fechado_em    TEXT
);

CREATE TABLE IF NOT EXISTS vendas (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    caixa_id      INTEGER NOT NULL REFERENCES caixas(id),
    usuario_id    INTEGER REFERENCES usuarios(id),
    total         REAL    NOT NULL DEFAULT 0.0,
    desconto      REAL    NOT NULL DEFAULT 0.0,
    pagamento     TEXT    NOT NULL DEFAULT 'dinheiro'
                  CHECK(pagamento IN ('dinheiro','pix','cartao_debito','cartao_credito')),
    valor_pago    REAL    NOT NULL DEFAULT 0.0,
    troco         REAL    NOT NULL DEFAULT 0.0,
    obs           TEXT    DEFAULT '',
    criado_em     TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS venda_itens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id    INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id  INTEGER NOT NULL REFERENCES produtos(id),
    descricao   TEXT    NOT NULL,
    quantidade  INTEGER NOT NULL,
    preco_unit  REAL    NOT NULL,
    subtotal    REAL    NOT NULL
);

CREATE TABLE IF NOT EXISTS alertas_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id  INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
    tipo        TEXT    NOT NULL,
    enviado     INTEGER NOT NULL DEFAULT 0,
    criado_em   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_mov_produto   ON movimentacoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_mov_criado    ON movimentacoes(criado_em);
CREATE INDEX IF NOT EXISTS idx_vendas_caixa  ON vendas(caixa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_criado ON vendas(criado_em);
CREATE INDEX IF NOT EXISTS idx_vitens_venda  ON venda_itens(venda_id);
"""


# ── Init ──────────────────────────────────────────────────────

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript(SCHEMA)

    # Admin padrão
    if not db.execute("SELECT 1 FROM usuarios WHERE email='admin@six.local'").fetchone():
        db.execute(
            "INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES (?,?,?,?)",
            ("Administrador", "admin@six.local",
             generate_password_hash("admin123"), "admin"),
        )
        print("[SiX PDV] Admin criado: admin@six.local / admin123")

    # Seed produtos
    if db.execute("SELECT COUNT(*) FROM produtos").fetchone()[0] == 0:
        if os.path.exists(SEED_PATH):
            with open(SEED_PATH, encoding="utf-8") as f:
                seed = json.load(f)
            db.executemany(
                """INSERT INTO produtos
                   (codigo,ean,descricao,categoria,unidade,preco_custo,preco_venda,
                    quantidade,minimo,maximo)
                   VALUES (:codigo,:ean,:descricao,:categoria,:unidade,
                           :preco_custo,:preco_venda,:quantidade,:minimo,:maximo)""",
                seed,
            )
            print(f"[SiX PDV] {len(seed)} produtos importados.")

    db.commit()
    db.close()
    print(f"[SiX PDV] Banco: {DB_PATH}")


# ── Helpers ───────────────────────────────────────────────────

def produto_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    qty, mn, mx = d["quantidade"], d["minimo"], d["maximo"]
    if qty == 0:
        d["status"] = "zero"
    elif qty < mn * 0.5:
        d["status"] = "critico"
    elif qty <= mn:
        d["status"] = "baixo"
    else:
        d["status"] = "normal"
    d["percentual"] = round(min(100, qty / mx * 100)) if mx > 0 else 0
    d.pop("status_order", None)
    return d


def build_produto_filters(args: dict) -> tuple[str, list]:
    clauses, params = [], []
    if q := args.get("q", "").strip():
        clauses.append("(p.descricao LIKE ? OR p.codigo LIKE ? OR p.ean LIKE ?)")
        like = f"%{q}%"
        params += [like, like, like]
    if cat := args.get("categoria", "").strip():
        clauses.append("p.categoria = ?")
        params.append(cat)
    if un := args.get("unidade", "").strip():
        clauses.append("p.unidade = ?")
        params.append(un)
    status = args.get("status", "").strip()
    if status == "normal":
        clauses.append("p.quantidade > p.minimo")
    elif status == "baixo":
        clauses.append("p.quantidade > 0 AND p.quantidade <= p.minimo AND p.quantidade >= p.minimo*0.5")
    elif status == "critico":
        clauses.append("p.quantidade > 0 AND p.quantidade < p.minimo*0.5")
    elif status == "zero":
        clauses.append("p.quantidade = 0")
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return where, params

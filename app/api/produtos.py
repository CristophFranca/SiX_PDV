"""API — Produtos"""
import sqlite3

from flask import jsonify, request, session

from ..auth import admin_required, login_required
from ..db import build_produto_filters, get_db, produto_to_dict
from ..mail import check_and_alert
from . import bp

SORT_MAP = {
    "codigo":      "p.codigo",
    "descricao":   "p.descricao",
    "categoria":   "p.categoria",
    "quantidade":  "p.quantidade",
    "preco_venda": "p.preco_venda",
    "_pct":        "(CAST(p.quantidade AS REAL)/NULLIF(p.maximo,0))",
}


@bp.get("/produtos")
@login_required
def produtos_listar():
    db = get_db()
    where, params = build_produto_filters(request.args)

    sort_col = SORT_MAP.get(request.args.get("sort", "descricao"), "p.descricao")
    sort_dir = "DESC" if request.args.get("dir", "asc") == "desc" else "ASC"

    kpis = dict(db.execute("""
        SELECT
            COUNT(*)                                                          AS total,
            COALESCE(SUM(quantidade), 0)                                      AS qty_total,
            COALESCE(SUM(quantidade * preco_custo), 0)                        AS valor_custo,
            COALESCE(SUM(quantidade * preco_venda), 0)                        AS valor_venda,
            SUM(CASE WHEN quantidade >  minimo            THEN 1 ELSE 0 END)  AS normal,
            SUM(CASE WHEN quantidade >  0
                      AND quantidade <= minimo            THEN 1 ELSE 0 END)  AS baixo,
            SUM(CASE WHEN quantidade >  0
                      AND quantidade <  minimo*0.5        THEN 1 ELSE 0 END)  AS critico,
            SUM(CASE WHEN quantidade =  0                 THEN 1 ELSE 0 END)  AS zero
        FROM produtos p
    """).fetchone())

    rows = db.execute(
        f"SELECT p.* FROM produtos p {where} ORDER BY {sort_col} {sort_dir}",
        params
    ).fetchall()

    return jsonify({
        "kpis":     kpis,
        "count":    len(rows),
        "produtos": [produto_to_dict(r) for r in rows],
    })


@bp.get("/produtos/<int:pid>")
@login_required
def produtos_detalhe(pid):
    db  = get_db()
    row = db.execute("SELECT * FROM produtos WHERE id=?", (pid,)).fetchone()
    if not row:
        return jsonify({"erro": "Produto não encontrado"}), 404

    movs = db.execute(
        """SELECT m.*, u.nome AS usuario_nome
           FROM movimentacoes m
           LEFT JOIN usuarios u ON u.id = m.usuario_id
           WHERE m.produto_id = ?
           ORDER BY m.criado_em DESC LIMIT 20""",
        (pid,)
    ).fetchall()

    p = produto_to_dict(row)
    p["movimentacoes"] = [dict(m) for m in movs]
    return jsonify(p)


@bp.post("/produtos")
@login_required
def produtos_criar():
    db   = get_db()
    data = request.json or {}
    required = ("codigo", "descricao", "categoria", "unidade",
                "quantidade", "minimo", "maximo")
    for field in required:
        if field not in data:
            return jsonify({"erro": f"Campo obrigatório: {field}"}), 400
    try:
        cur = db.execute(
            """INSERT INTO produtos
               (codigo,ean,descricao,categoria,unidade,
                preco_custo,preco_venda,quantidade,minimo,maximo)
               VALUES (:codigo,:ean,:descricao,:categoria,:unidade,
                       :preco_custo,:preco_venda,:quantidade,:minimo,:maximo)""",
            {
                **data,
                "ean":         data.get("ean", ""),
                "preco_custo": float(data.get("preco_custo", 0)),
                "preco_venda": float(data.get("preco_venda", 0)),
            },
        )
        db.commit()
        check_and_alert(db, cur.lastrowid)
        db.commit()
        row = db.execute("SELECT * FROM produtos WHERE id=?", (cur.lastrowid,)).fetchone()
        return jsonify(produto_to_dict(row)), 201
    except sqlite3.IntegrityError:
        return jsonify({"erro": "Código já cadastrado"}), 409


@bp.put("/produtos/<int:pid>")
@login_required
def produtos_atualizar(pid):
    db   = get_db()
    data = request.json or {}
    allowed = ["ean", "descricao", "categoria", "unidade",
               "preco_custo", "preco_venda",
               "quantidade", "minimo", "maximo"]
    sets = ", ".join(f"{f}=:{f}" for f in allowed if f in data)
    if not sets:
        return jsonify({"erro": "Nenhum campo para atualizar"}), 400

    db.execute(
        f"UPDATE produtos SET {sets}, atualizado_em=datetime('now','localtime') WHERE id=:id",
        {**data, "id": pid},
    )
    db.commit()
    check_and_alert(db, pid)
    db.commit()
    row = db.execute("SELECT * FROM produtos WHERE id=?", (pid,)).fetchone()
    if not row:
        return jsonify({"erro": "Produto não encontrado"}), 404
    return jsonify(produto_to_dict(row))


@bp.delete("/produtos/<int:pid>")
@login_required
@admin_required
def produtos_deletar(pid):
    db = get_db()
    if not db.execute("DELETE FROM produtos WHERE id=?", (pid,)).rowcount:
        return jsonify({"erro": "Produto não encontrado"}), 404
    db.commit()
    return jsonify({"ok": True})

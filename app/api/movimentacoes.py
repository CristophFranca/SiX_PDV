"""API — Movimentações de estoque"""
from flask import jsonify, request, session

from ..auth import login_required
from ..db import get_db, produto_to_dict
from ..mail import check_and_alert
from . import bp


@bp.post("/movimentacoes")
@login_required
def mov_registrar():
    db   = get_db()
    data = request.json or {}
    pid  = data.get("produto_id")
    tipo = data.get("tipo")
    qty  = data.get("quantidade")

    if not all([pid, tipo, qty is not None]):
        return jsonify({"erro": "produto_id, tipo e quantidade são obrigatórios"}), 400
    if tipo not in ("entrada", "saida", "ajuste"):
        return jsonify({"erro": "tipo inválido"}), 400

    row = db.execute("SELECT quantidade FROM produtos WHERE id=?", (pid,)).fetchone()
    if not row:
        return jsonify({"erro": "Produto não encontrado"}), 404

    atual = row["quantidade"]
    if tipo == "entrada":
        nova = atual + qty
    elif tipo == "saida":
        nova = max(0, atual - qty)
    else:
        nova = qty

    db.execute(
        "UPDATE produtos SET quantidade=?, atualizado_em=datetime('now','localtime') WHERE id=?",
        (nova, pid)
    )
    db.execute(
        """INSERT INTO movimentacoes (produto_id,usuario_id,tipo,quantidade,observacao)
           VALUES (?,?,?,?,?)""",
        (pid, session.get("user_id"), tipo, qty, data.get("observacao", "")),
    )
    db.commit()
    check_and_alert(db, pid)
    db.commit()

    row = db.execute("SELECT * FROM produtos WHERE id=?", (pid,)).fetchone()
    return jsonify(produto_to_dict(row))

"""API — Caixa / PDV"""
from flask import jsonify, request, session

from ..auth import login_required
from ..db import get_db, produto_to_dict
from ..mail import check_and_alert
from . import bp


# ── Caixa ─────────────────────────────────────────────────────

@bp.get("/caixa/status")
@login_required
def caixa_status():
    """Retorna o caixa aberto do usuário (ou None)."""
    db  = get_db()
    row = db.execute(
        "SELECT * FROM caixas WHERE usuario_id=? AND status='aberto' ORDER BY id DESC LIMIT 1",
        (session["user_id"],)
    ).fetchone()
    if not row:
        return jsonify({"caixa": None})
    return jsonify({"caixa": dict(row)})


@bp.post("/caixa/abrir")
@login_required
def caixa_abrir():
    db  = get_db()
    uid = session["user_id"]

    # Não abre duplo
    aberto = db.execute(
        "SELECT id FROM caixas WHERE usuario_id=? AND status='aberto'", (uid,)
    ).fetchone()
    if aberto:
        return jsonify({"erro": "Já existe um caixa aberto"}), 409

    saldo_inicial = float(request.json.get("saldo_inicial", 0))
    cur = db.execute(
        "INSERT INTO caixas (usuario_id, saldo_inicial) VALUES (?,?)",
        (uid, saldo_inicial)
    )
    db.commit()
    row = db.execute("SELECT * FROM caixas WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201


@bp.post("/caixa/fechar")
@login_required
def caixa_fechar():
    db  = get_db()
    uid = session["user_id"]

    caixa = db.execute(
        "SELECT * FROM caixas WHERE usuario_id=? AND status='aberto'", (uid,)
    ).fetchone()
    if not caixa:
        return jsonify({"erro": "Nenhum caixa aberto"}), 404

    # Totais do caixa
    totais = db.execute(
        """SELECT
               COALESCE(SUM(total),0)                                              AS total,
               COALESCE(SUM(CASE WHEN pagamento='dinheiro'     THEN total ELSE 0 END),0) AS dinheiro,
               COALESCE(SUM(CASE WHEN pagamento='pix'          THEN total ELSE 0 END),0) AS pix,
               COALESCE(SUM(CASE WHEN pagamento LIKE 'cartao%' THEN total ELSE 0 END),0) AS cartao,
               COUNT(*) AS qtd_vendas
           FROM vendas WHERE caixa_id=?""",
        (caixa["id"],)
    ).fetchone()

    saldo_final = caixa["saldo_inicial"] + totais["dinheiro"]

    db.execute(
        """UPDATE caixas
           SET status='fechado', saldo_final=?, fechado_em=datetime('now','localtime')
           WHERE id=?""",
        (saldo_final, caixa["id"])
    )
    db.commit()

    return jsonify({
        "caixa_id":     caixa["id"],
        "saldo_inicial": caixa["saldo_inicial"],
        "saldo_final":  saldo_final,
        "total_vendas": totais["total"],
        "qtd_vendas":   totais["qtd_vendas"],
        "dinheiro":     totais["dinheiro"],
        "pix":          totais["pix"],
        "cartao":       totais["cartao"],
    })


@bp.get("/caixa/resumo")
@login_required
def caixa_resumo():
    """Resumo do caixa aberto atual."""
    db  = get_db()
    uid = session["user_id"]
    caixa = db.execute(
        "SELECT * FROM caixas WHERE usuario_id=? AND status='aberto'", (uid,)
    ).fetchone()
    if not caixa:
        return jsonify({"erro": "Nenhum caixa aberto"}), 404

    totais = db.execute(
        """SELECT
               COALESCE(SUM(total),0)                                              AS total,
               COALESCE(SUM(CASE WHEN pagamento='dinheiro'     THEN total ELSE 0 END),0) AS dinheiro,
               COALESCE(SUM(CASE WHEN pagamento='pix'          THEN total ELSE 0 END),0) AS pix,
               COALESCE(SUM(CASE WHEN pagamento LIKE 'cartao%' THEN total ELSE 0 END),0) AS cartao,
               COUNT(*) AS qtd_vendas
           FROM vendas WHERE caixa_id=?""",
        (caixa["id"],)
    ).fetchone()

    return jsonify({**dict(caixa), **dict(totais)})


# ── Vendas ────────────────────────────────────────────────────

@bp.post("/caixa/venda")
@login_required
def caixa_registrar_venda():
    """Registra uma venda, debita estoque e retorna o comprovante."""
    db   = get_db()
    uid  = session["user_id"]
    data = request.json or {}

    # Valida caixa aberto
    caixa = db.execute(
        "SELECT * FROM caixas WHERE usuario_id=? AND status='aberto'", (uid,)
    ).fetchone()
    if not caixa:
        return jsonify({"erro": "Abra o caixa antes de registrar vendas"}), 400

    itens     = data.get("itens", [])
    pagamento = data.get("pagamento", "dinheiro")
    desconto  = float(data.get("desconto", 0))
    valor_pago = float(data.get("valor_pago", 0))

    if not itens:
        return jsonify({"erro": "Nenhum item na venda"}), 400
    if pagamento not in ("dinheiro", "pix", "cartao_debito", "cartao_credito"):
        return jsonify({"erro": "Forma de pagamento inválida"}), 400

    # Valida estoque e calcula total
    subtotal = 0.0
    itens_validados = []
    for item in itens:
        pid = item.get("produto_id")
        qty = int(item.get("quantidade", 1))
        row = db.execute("SELECT * FROM produtos WHERE id=?", (pid,)).fetchone()
        if not row:
            return jsonify({"erro": f"Produto '{pid}' não encontrado"}), 404

        # Validação de estoque suficiente
        if row["quantidade"] <= 0:
            return jsonify({
                "erro": f"Produto '{row['descricao']}' está sem estoque."
            }), 400
        if qty > row["quantidade"]:
            return jsonify({
                "erro": (
                    f"Estoque insuficiente para '{row['descricao']}'. "
                    f"Disponível: {int(row['quantidade'])} {row['unidade']} — "
                    f"Solicitado: {qty} {row['unidade']}."
                )
            }), 400

        preco = float(item.get("preco_unit", row["preco_venda"]))
        sub   = round(preco * qty, 2)
        subtotal += sub
        itens_validados.append({
            "produto_id": pid,
            "descricao":  row["descricao"],
            "quantidade": qty,
            "preco_unit": preco,
            "subtotal":   sub,
            "unidade":    row["unidade"],
        })

    total = round(max(0, subtotal - desconto), 2)
    troco = round(max(0, valor_pago - total), 2) if pagamento == "dinheiro" else 0.0

    # Insere venda
    cur = db.execute(
        """INSERT INTO vendas
           (caixa_id,usuario_id,total,desconto,pagamento,valor_pago,troco,obs)
           VALUES (?,?,?,?,?,?,?,?)""",
        (caixa["id"], uid, total, desconto,
         pagamento, valor_pago, troco, data.get("obs", "")),
    )
    venda_id = cur.lastrowid

    # Insere itens e debita estoque
    for item in itens_validados:
        db.execute(
            """INSERT INTO venda_itens
               (venda_id,produto_id,descricao,quantidade,preco_unit,subtotal)
               VALUES (?,?,?,?,?,?)""",
            (venda_id, item["produto_id"], item["descricao"],
             item["quantidade"], item["preco_unit"], item["subtotal"]),
        )
        db.execute(
            """UPDATE produtos
               SET quantidade = MAX(0, quantidade - ?),
                   atualizado_em = datetime('now','localtime')
               WHERE id=?""",
            (item["quantidade"], item["produto_id"]),
        )

    db.commit()

    # Alertas pós-venda
    for item in itens_validados:
        check_and_alert(db, item["produto_id"])
    db.commit()

    return jsonify({
        "venda_id":  venda_id,
        "total":     total,
        "desconto":  desconto,
        "troco":     troco,
        "pagamento": pagamento,
        "itens":     itens_validados,
    }), 201


@bp.get("/caixa/vendas")
@login_required
def caixa_listar_vendas():
    """Histórico de vendas (filtro por data)."""
    db   = get_db()
    data = request.args.get("data", "")
    if data:
        rows = db.execute(
            "SELECT * FROM vendas WHERE DATE(criado_em)=? ORDER BY criado_em DESC",
            (data,)
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM vendas ORDER BY criado_em DESC LIMIT 50"
        ).fetchall()

    result = []
    for v in rows:
        vd = dict(v)
        vd["itens"] = [dict(i) for i in db.execute(
            "SELECT * FROM venda_itens WHERE venda_id=?", (v["id"],)
        ).fetchall()]
        result.append(vd)
    return jsonify(result)


@bp.get("/caixa/vendas/<int:vid>")
@login_required
def caixa_detalhe_venda(vid):
    db  = get_db()
    row = db.execute("SELECT * FROM vendas WHERE id=?", (vid,)).fetchone()
    if not row:
        return jsonify({"erro": "Venda não encontrada"}), 404
    vd = dict(row)
    vd["itens"] = [dict(i) for i in db.execute(
        "SELECT * FROM venda_itens WHERE venda_id=?", (vid,)
    ).fetchall()]
    return jsonify(vd)

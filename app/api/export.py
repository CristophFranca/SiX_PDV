"""API — Exportação CSV"""
import csv
from datetime import datetime
from io import StringIO

from flask import Response, request

from ..auth import login_required
from ..db import build_produto_filters, get_db, produto_to_dict
from . import bp


@bp.get("/export/produtos")
@login_required
def export_produtos():
    db = get_db()
    where, params = build_produto_filters(request.args)
    rows = db.execute(
        f"SELECT p.* FROM produtos p {where} ORDER BY p.descricao", params
    ).fetchall()

    buf = StringIO()
    w   = csv.writer(buf)
    w.writerow(["Código","EAN","Descrição","Categoria","Unidade",
                "Preço Custo","Preço Venda","Quantidade","Mínimo","Máximo","Status"])
    for r in rows:
        d = produto_to_dict(r)
        w.writerow([d["codigo"], d["ean"], d["descricao"], d["categoria"],
                    d["unidade"], d["preco_custo"], d["preco_venda"],
                    d["quantidade"], d["minimo"], d["maximo"], d["status"]])

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return Response(
        buf.getvalue(), mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=six_estoque_{ts}.csv"}
    )


@bp.get("/export/vendas")
@login_required
def export_vendas():
    db   = get_db()
    data = request.args.get("data", "")
    if data:
        vendas = db.execute(
            "SELECT * FROM vendas WHERE DATE(criado_em)=? ORDER BY criado_em DESC", (data,)
        ).fetchall()
    else:
        vendas = db.execute(
            "SELECT * FROM vendas ORDER BY criado_em DESC LIMIT 500"
        ).fetchall()

    buf = StringIO()
    w   = csv.writer(buf)
    w.writerow(["Venda ID","Data/Hora","Pagamento","Subtotal","Desconto","Total","Troco","Itens"])
    for v in vendas:
        itens = db.execute(
            "SELECT descricao, quantidade, preco_unit FROM venda_itens WHERE venda_id=?", (v["id"],)
        ).fetchall()
        resumo = "; ".join(f"{i['descricao']} x{i['quantidade']}" for i in itens)
        w.writerow([v["id"], v["criado_em"], v["pagamento"],
                    v["total"] + v["desconto"], v["desconto"], v["total"], v["troco"], resumo])

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return Response(
        buf.getvalue(), mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=six_vendas_{ts}.csv"}
    )

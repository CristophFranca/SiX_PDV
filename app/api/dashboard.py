"""API — Dashboard"""
from flask import jsonify

from ..auth import login_required
from ..db import get_db, produto_to_dict
from . import bp


@bp.get("/dashboard")
@login_required
def dashboard_dados():
    db = get_db()

    # KPIs gerais
    kpis = dict(db.execute("""
        SELECT
            COUNT(*)                                                   AS total,
            COALESCE(SUM(quantidade), 0)                               AS qty_total,
            COALESCE(SUM(quantidade * preco_custo), 0)                 AS valor_custo,
            COALESCE(SUM(quantidade * preco_venda), 0)                 AS valor_venda,
            SUM(CASE WHEN quantidade >  minimo           THEN 1 ELSE 0 END) AS normal,
            SUM(CASE WHEN quantidade >  0
                      AND quantidade <= minimo           THEN 1 ELSE 0 END) AS baixo,
            SUM(CASE WHEN quantidade >  0
                      AND quantidade <  minimo*0.5       THEN 1 ELSE 0 END) AS critico,
            SUM(CASE WHEN quantidade =  0                THEN 1 ELSE 0 END) AS zero
        FROM produtos
    """).fetchone())

    # Faturamento do dia (vendas finalizadas)
    faturamento = dict(db.execute("""
        SELECT
            COUNT(*)               AS qtd_vendas,
            COALESCE(SUM(total),0) AS total_dia,
            COALESCE(SUM(CASE WHEN pagamento='dinheiro'       THEN total ELSE 0 END),0) AS dinheiro,
            COALESCE(SUM(CASE WHEN pagamento='pix'            THEN total ELSE 0 END),0) AS pix,
            COALESCE(SUM(CASE WHEN pagamento LIKE 'cartao%'   THEN total ELSE 0 END),0) AS cartao
        FROM vendas
        WHERE DATE(criado_em) = DATE('now','localtime')
    """).fetchone())

    # Por categoria
    por_cat = [dict(r) for r in db.execute("""
        SELECT categoria,
               COUNT(*)        AS total,
               SUM(quantidade) AS qty,
               SUM(CASE WHEN quantidade <= minimo THEN 1 ELSE 0 END) AS alertas
        FROM produtos GROUP BY categoria ORDER BY total DESC
    """).fetchall()]

    # Críticos/zerados (top 8)
    criticos = [produto_to_dict(r) for r in db.execute("""
        SELECT * FROM produtos
        WHERE quantidade <= minimo
        ORDER BY CAST(quantidade AS REAL)/NULLIF(minimo,1) ASC
        LIMIT 8
    """).fetchall()]

    # Movimentações 14 dias
    mov_14d = [dict(r) for r in db.execute("""
        SELECT DATE(criado_em) AS dia,
               SUM(CASE WHEN tipo='entrada' THEN quantidade ELSE 0 END) AS entradas,
               SUM(CASE WHEN tipo='saida'   THEN quantidade ELSE 0 END) AS saidas,
               COUNT(*) AS operacoes
        FROM movimentacoes
        WHERE criado_em >= datetime('now','-14 days','localtime')
        GROUP BY dia ORDER BY dia ASC
    """).fetchall()]

    # Vendas 7 dias
    vendas_7d = [dict(r) for r in db.execute("""
        SELECT DATE(criado_em) AS dia,
               COUNT(*)               AS qtd,
               COALESCE(SUM(total),0) AS total
        FROM vendas
        WHERE criado_em >= datetime('now','-7 days','localtime')
        GROUP BY dia ORDER BY dia ASC
    """).fetchall()]

    # Feed recente (movimentações + vendas)
    mov_rec = [dict(r) for r in db.execute("""
        SELECT m.tipo, m.quantidade, m.criado_em,
               p.descricao AS produto, p.unidade,
               u.nome AS usuario
        FROM movimentacoes m
        JOIN produtos p ON p.id = m.produto_id
        LEFT JOIN usuarios u ON u.id = m.usuario_id
        ORDER BY m.criado_em DESC LIMIT 10
    """).fetchall()]

    return jsonify({
        "kpis":         kpis,
        "faturamento":  faturamento,
        "por_categoria": por_cat,
        "criticos":     criticos,
        "mov_14d":      mov_14d,
        "vendas_7d":    vendas_7d,
        "mov_recentes": mov_rec,
        "status_dist": [
            {"label": "Normal",  "value": kpis["normal"],  "color": "#15803d"},
            {"label": "Baixo",   "value": kpis["baixo"],   "color": "#a16207"},
            {"label": "Crítico", "value": kpis["critico"], "color": "#b91c1c"},
            {"label": "Zerado",  "value": kpis["zero"],    "color": "#c2410c"},
        ],
    })

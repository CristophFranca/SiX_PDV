from flask import Blueprint

bp = Blueprint("api", __name__)

from . import auth, produtos, movimentacoes, usuarios, dashboard, caixa, export  # noqa: E402, F401

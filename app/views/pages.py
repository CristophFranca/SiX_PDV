"""Views — Páginas HTML"""
from flask import redirect, render_template, session, url_for

from ..auth import current_user, login_required
from . import bp


@bp.get("/login")
def login_page():
    if "user_id" in session:
        return redirect(url_for("views.estoque"))
    return render_template("login.html")


@bp.get("/")
@login_required
def estoque():
    return render_template("estoque.html", user=current_user())


@bp.get("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", user=current_user())


@bp.get("/caixa")
@login_required
def caixa():
    return render_template("caixa.html", user=current_user())

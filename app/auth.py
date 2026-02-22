"""
SiX — Autenticação
Decorators login_required / admin_required e helper current_user.
"""
from functools import wraps

from flask import jsonify, redirect, request, session, url_for


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"erro": "Não autenticado"}), 401
            return redirect(url_for("views.login_page"))
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get("perfil") != "admin":
            if request.path.startswith("/api/"):
                return jsonify({"erro": "Acesso restrito a administradores"}), 403
            return redirect(url_for("views.estoque"))
        return f(*args, **kwargs)
    return decorated


def current_user() -> dict:
    return {
        "id":     session.get("user_id"),
        "nome":   session.get("nome"),
        "email":  session.get("email"),
        "perfil": session.get("perfil"),
    }

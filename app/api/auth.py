"""API — Autenticação"""
from flask import jsonify, request, session
from werkzeug.security import check_password_hash

from ..auth import current_user, login_required
from ..db import get_db
from . import bp


@bp.post("/auth/login")
def auth_login():
    data  = request.json or {}
    email = data.get("email", "").strip().lower()
    senha = data.get("senha", "")
    if not email or not senha:
        return jsonify({"erro": "E-mail e senha obrigatórios"}), 400

    db  = get_db()
    row = db.execute(
        "SELECT * FROM usuarios WHERE email=? AND ativo=1", (email,)
    ).fetchone()
    if not row or not check_password_hash(row["senha_hash"], senha):
        return jsonify({"erro": "E-mail ou senha inválidos"}), 401

    db.execute(
        "UPDATE usuarios SET ultimo_acesso=datetime('now','localtime') WHERE id=?",
        (row["id"],)
    )
    db.commit()

    session.permanent = True
    session["user_id"] = row["id"]
    session["nome"]    = row["nome"]
    session["email"]   = row["email"]
    session["perfil"]  = row["perfil"]

    return jsonify({"ok": True, "perfil": row["perfil"], "nome": row["nome"]})


@bp.post("/auth/logout")
def auth_logout():
    session.clear()
    return jsonify({"ok": True})


@bp.get("/auth/me")
@login_required
def auth_me():
    return jsonify(current_user())

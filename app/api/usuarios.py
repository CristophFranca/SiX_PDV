"""API — Usuários (admin only)"""
import sqlite3

from flask import jsonify, request, session
from werkzeug.security import generate_password_hash

from ..auth import admin_required, login_required
from ..db import get_db
from . import bp


@bp.get("/usuarios")
@login_required
@admin_required
def usuarios_listar():
    rows = get_db().execute(
        "SELECT id,nome,email,perfil,ativo,criado_em,ultimo_acesso FROM usuarios ORDER BY nome"
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@bp.post("/usuarios")
@login_required
@admin_required
def usuarios_criar():
    data   = request.json or {}
    nome   = data.get("nome", "").strip()
    email  = data.get("email", "").strip().lower()
    senha  = data.get("senha", "")
    perfil = data.get("perfil", "operador")

    if not all([nome, email, senha]):
        return jsonify({"erro": "Nome, e-mail e senha são obrigatórios"}), 400
    if len(senha) < 6:
        return jsonify({"erro": "Senha deve ter no mínimo 6 caracteres"}), 400
    if perfil not in ("admin", "operador"):
        return jsonify({"erro": "Perfil inválido"}), 400

    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES (?,?,?,?)",
            (nome, email, generate_password_hash(senha), perfil),
        )
        db.commit()
        row = db.execute(
            "SELECT id,nome,email,perfil,ativo,criado_em FROM usuarios WHERE id=?",
            (cur.lastrowid,)
        ).fetchone()
        return jsonify(dict(row)), 201
    except sqlite3.IntegrityError:
        return jsonify({"erro": "E-mail já cadastrado"}), 409


@bp.put("/usuarios/<int:uid>")
@login_required
@admin_required
def usuarios_atualizar(uid):
    data   = request.json or {}
    db     = get_db()
    campos = {}

    if "nome"   in data: campos["nome"]      = data["nome"].strip()
    if "perfil" in data:
        if data["perfil"] not in ("admin", "operador"):
            return jsonify({"erro": "Perfil inválido"}), 400
        campos["perfil"] = data["perfil"]
    if "ativo" in data:
        campos["ativo"] = int(bool(data["ativo"]))
    if data.get("senha"):
        campos["senha_hash"] = generate_password_hash(data["senha"])

    if not campos:
        return jsonify({"erro": "Nenhum campo para atualizar"}), 400

    sets = ", ".join(f"{k}=?" for k in campos)
    db.execute(f"UPDATE usuarios SET {sets} WHERE id=?", (*campos.values(), uid))
    db.commit()

    row = db.execute(
        "SELECT id,nome,email,perfil,ativo,criado_em,ultimo_acesso FROM usuarios WHERE id=?",
        (uid,)
    ).fetchone()
    if not row:
        return jsonify({"erro": "Usuário não encontrado"}), 404
    return jsonify(dict(row))


@bp.delete("/usuarios/<int:uid>")
@login_required
@admin_required
def usuarios_deletar(uid):
    if uid == session["user_id"]:
        return jsonify({"erro": "Não é possível excluir seu próprio usuário"}), 400
    db = get_db()
    if not db.execute("DELETE FROM usuarios WHERE id=?", (uid,)).rowcount:
        return jsonify({"erro": "Usuário não encontrado"}), 404
    db.commit()
    return jsonify({"ok": True})

"""
SiX PDV — Alertas por e-mail
Configure as variáveis de ambiente no .env para ativar.
"""
import os

MAIL_ENABLED  = os.environ.get("MAIL_ENABLED", "false").lower() == "true"
MAIL_SERVER   = os.environ.get("MAIL_SERVER",   "smtp.gmail.com")
MAIL_PORT     = int(os.environ.get("MAIL_PORT", 587))
MAIL_USER     = os.environ.get("MAIL_USER",     "")
MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")
MAIL_FROM     = os.environ.get("MAIL_FROM",     "SiX PDV <noreply@six.local>")
MAIL_TO       = os.environ.get("MAIL_TO",       "")


def send_alert(subject: str, body: str) -> None:
    """Envia e-mail. Silencioso se desabilitado."""
    if not MAIL_ENABLED or not MAIL_USER or not MAIL_TO:
        return
    try:
        import smtplib
        from email.mime.text import MIMEText
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"]    = MAIL_FROM
        msg["To"]      = MAIL_TO
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as s:
            s.starttls()
            s.login(MAIL_USER, MAIL_PASSWORD)
            s.sendmail(MAIL_USER, [MAIL_TO], msg.as_string())
        print(f"[SiX PDV] E-mail enviado: {subject}")
    except Exception as e:
        print(f"[SiX PDV] Falha no e-mail: {e}")


def check_and_alert(db, produto_id: int) -> None:
    """Verifica nível do produto e envia alerta se necessário (1x/24h)."""
    row = db.execute(
        "SELECT descricao, quantidade, minimo FROM produtos WHERE id=?",
        (produto_id,)
    ).fetchone()
    if not row:
        return

    qty, mn = row["quantidade"], row["minimo"]
    if qty == 0:
        tipo = "zero"
    elif qty < mn * 0.5:
        tipo = "critico"
    else:
        return

    # Anti-spam: 1 alerta por produto+tipo por 24h
    if db.execute(
        """SELECT 1 FROM alertas_log
           WHERE produto_id=? AND tipo=?
             AND criado_em > datetime('now','-24 hours','localtime')""",
        (produto_id, tipo)
    ).fetchone():
        return

    db.execute(
        "INSERT INTO alertas_log (produto_id,tipo,enviado) VALUES (?,?,?)",
        (produto_id, tipo, 1 if MAIL_ENABLED else 0)
    )

    status_str = "ZERADO" if tipo == "zero" else "CRÍTICO"
    send_alert(
        f"[SiX PDV] {row['descricao']} está {status_str}",
        f"Produto : {row['descricao']}\n"
        f"Qtd atual: {qty}\n"
        f"Mínimo   : {mn}\n"
        f"Status   : {status_str}\n\n"
        f"Acesse o SiX PDV para repor o estoque.",
    )

"""
SiX — Application Factory
"""
import os
import secrets

from flask import Flask

from .db import close_db, init_db


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates"),
        static_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), "static"),
    )
    app.secret_key = os.environ.get("SIX_SECRET", secrets.token_hex(32))

    # Teardown DB
    app.teardown_appcontext(close_db)

    # Blueprints
    from .api import bp as api_bp
    from .views import bp as views_bp

    app.register_blueprint(api_bp,   url_prefix="/api")
    app.register_blueprint(views_bp)

    return app

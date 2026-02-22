"""SiX — Ponto de entrada"""
from app import create_app
from app.db import init_db

app = create_app()

if __name__ == "__main__":
    init_db()
    print("=" * 48)
    print("  SiX PDV — http://localhost:5000")
    print("  Login: admin@six.local / admin123")
    print("=" * 48)
    app.run(debug=True, port=5000)

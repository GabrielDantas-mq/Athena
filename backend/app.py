"""
Athena — backend simples (Flask + SQLite)

O que este arquivo faz:
1) Serve os arquivos do front-end (html/css/js/assets) que já existem no projeto.
2) Expõe uma API pequena para cadastro/login/logout de usuários.
3) Guarda os usuários num banco SQLite local (athena.db), criado automaticamente.

Como rodar (veja também o README.md nesta pasta):
    pip install -r requirements.txt
    python app.py
Depois acesse http://localhost:5000 no navegador.
"""

import os
import re
import sqlite3
from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash

# ---------------------------------------------------------------------------
# Configuração básica
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)          # pasta que contém html/ css/ js/ assets/
DB_PATH = os.path.join(BASE_DIR, "athena.db")

app = Flask(__name__, static_folder=PROJECT_ROOT, static_url_path="")

# Em produção, defina a variável de ambiente ATHENA_SECRET com um valor único e secreto.
app.secret_key = os.environ.get("ATHENA_SECRET", "troque-esta-chave-antes-de-usar-em-producao")

# Lista de cargos válidos — precisa bater com a lista usada no front-end (js/js.js).
CARGOS = [
    {"id": "estagiario", "nome": "Estagiário"},
    {"id": "financeiro", "nome": "Analista Financeiro"},
    {"id": "rh", "nome": "Analista de RH"},
    {"id": "ti", "nome": "Analista de TI"},
    {"id": "gerente", "nome": "Gerente de Operações"},
    {"id": "diretor", "nome": "Diretor"},
]
CARGO_IDS = {c["id"] for c in CARGOS}
CARGO_NOME = {c["id"]: c["nome"] for c in CARGOS}

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------------------------------------------------------------------------
# Banco de dados
# ---------------------------------------------------------------------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            cargo TEXT NOT NULL,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def usuario_publico(row):
    """Formata um registro do banco para o formato enviado ao front-end (sem a senha)."""
    return {
        "id": row["id"],
        "nome": row["nome"],
        "email": row["email"],
        "cargo": row["cargo"],
        "cargoNome": CARGO_NOME.get(row["cargo"], row["cargo"]),
    }


# ---------------------------------------------------------------------------
# Rotas de front-end (arquivos estáticos)
# ---------------------------------------------------------------------------
@app.route("/")
def raiz():
    return send_from_directory(os.path.join(PROJECT_ROOT, "html"), "index.html")


# ---------------------------------------------------------------------------
# API — Autenticação
# ---------------------------------------------------------------------------
@app.route("/api/cargos", methods=["GET"])
def api_cargos():
    return jsonify(CARGOS)


@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or {}
    nome = (data.get("nome") or "").strip()
    email = (data.get("email") or "").strip().lower()
    senha = data.get("senha") or ""
    cargo = data.get("cargo") or ""

    if len(nome) < 2:
        return jsonify({"erro": "Informe seu nome completo."}), 400
    if not EMAIL_REGEX.match(email):
        return jsonify({"erro": "E-mail inválido."}), 400
    if len(senha) < 6:
        return jsonify({"erro": "A senha precisa ter pelo menos 6 caracteres."}), 400
    if cargo not in CARGO_IDS:
        return jsonify({"erro": "Cargo inválido."}), 400

    conn = get_db()
    existente = conn.execute("SELECT id FROM usuarios WHERE email = ?", (email,)).fetchone()
    if existente:
        conn.close()
        return jsonify({"erro": "Já existe uma conta com este e-mail."}), 409

    senha_hash = generate_password_hash(senha)
    cursor = conn.execute(
        "INSERT INTO usuarios (nome, email, senha_hash, cargo) VALUES (?, ?, ?, ?)",
        (nome, email, senha_hash, cargo),
    )
    conn.commit()
    novo_id = cursor.lastrowid
    row = conn.execute("SELECT * FROM usuarios WHERE id = ?", (novo_id,)).fetchone()
    conn.close()

    session["user_id"] = row["id"]
    return jsonify({"ok": True, "usuario": usuario_publico(row)})


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    senha = data.get("senha") or ""

    conn = get_db()
    row = conn.execute("SELECT * FROM usuarios WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not row or not check_password_hash(row["senha_hash"], senha):
        return jsonify({"erro": "E-mail ou senha incorretos."}), 401

    session["user_id"] = row["id"]
    return jsonify({"ok": True, "usuario": usuario_publico(row)})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/me", methods=["GET"])
def api_me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"erro": "Não autenticado."}), 401

    conn = get_db()
    row = conn.execute("SELECT * FROM usuarios WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    if not row:
        session.clear()
        return jsonify({"erro": "Não autenticado."}), 401

    return jsonify({"ok": True, "usuario": usuario_publico(row)})


# ---------------------------------------------------------------------------
# Cria a tabela de usuários assim que o módulo é carregado — necessário para
# hospedagens que importam este arquivo via WSGI (ex.: PythonAnywhere), que nunca
# passam pelo bloco "if __name__" abaixo.
init_db()

if __name__ == "__main__":
    app.run(debug=True, port=5000)

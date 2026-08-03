# Athena — Backend

Backend simples em **Flask + SQLite** para cadastro e login de usuários.

## Como rodar

1. Abra um terminal nesta pasta (`backend/`).
2. (Recomendado) Crie um ambiente virtual:
   ```bash
   python -m venv venv
   venv\Scripts\activate        # Windows
   source venv/bin/activate     # macOS/Linux
   ```
3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
4. Rode o servidor:
   ```bash
   python app.py
   ```
5. Acesse **http://localhost:5000** no navegador.

O Flask já serve o front-end (`html/`, `css/`, `js/`, `assets/`) automaticamente —
não precisa mais abrir o `index.html` direto no navegador, é só usar a URL acima.

## O que foi criado

- `athena.db` — banco SQLite criado automaticamente na primeira execução, com a
  tabela `usuarios` (nome, e-mail, senha com hash, cargo).
- Sessão de login via cookie do Flask (`session`), então o usuário continua
  logado ao recarregar a página, até clicar em "Sair".

## Endpoints da API

| Método | Rota            | Descrição                                   |
|--------|-----------------|----------------------------------------------|
| GET    | `/api/cargos`   | Lista os cargos disponíveis para cadastro     |
| POST   | `/api/register` | Cria um novo usuário `{nome, email, senha, cargo}` |
| POST   | `/api/login`    | Autentica `{email, senha}`                    |
| POST   | `/api/logout`   | Encerra a sessão atual                        |
| GET    | `/api/me`       | Retorna o usuário logado (ou 401)             |

## Antes de usar em produção

- Troque o valor de `app.secret_key` em `app.py` (ou defina a variável de
  ambiente `ATHENA_SECRET`) por um valor único e secreto.
- SQLite é ótimo para protótipo/uso pequeno; se a empresa crescer, vale migrar
  para PostgreSQL ou MySQL — a estrutura do código já separa bem essa parte.

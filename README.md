# Retail BI

A self-hosted retail dashboard: products, stock, sales, expenses and profit reporting.
Python backend (FastAPI + SQLAlchemy), PostgreSQL database, server-rendered pages. No Node, no Base44.

You own the code and the data. Nothing here phones home.

## Stack

| Layer | Choice |
| --- | --- |
| Web framework | FastAPI + Uvicorn |
| Database access | SQLAlchemy 2.0 (typed ORM) |
| Database | PostgreSQL (psycopg 3); SQLite works for local testing |
| Templating | Jinja2, server-rendered HTML |
| Auth | bcrypt password hash + signed session cookie |
| Styling | one plain CSS file, no build step |

## What it does

- **Dashboard** — sales today, sales this month, gross profit, net after expenses, 7-day revenue bars, top sellers, low-stock list, recent sales.
- **Products** — add, edit, archive; cost price, selling price, opening stock, reorder level, margin per row.
- **Stock** — opening stock plus receipts minus units sold, value on hand at cost, low-stock flags, receipt history. Receiving stock at a new unit cost updates the product cost price so profit stays honest.
- **Sales** — multi-line entry with discounts and optional tax, sequential references like `S-261117-001`, COGS and gross profit stored on every sale.
- **Expenses** — dated expenses with category, payee, method, plus a spend-by-category breakdown.
- **Settings** — store name, currency code and locale, tax on/off and rate.

Money is stored as integer minor units (kobo/cents), so totals never drift.

## Run it locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env       # then edit it
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000. Tables and your login are created on first startup from the env vars.
Visitors who are not signed in land on `/welcome`, and can create their own account at `/signup`
if they know the store code (shown in Settings).

Quick local run without Postgres:

```bash
DATABASE_URL="sqlite:///./retail.db" \
SESSION_SECRET="dev-secret-change-me-please" \
INITIAL_EMAIL="you@example.com" \
INITIAL_PASSWORD="pass1234" \
uvicorn app.main:app --reload
```

## Deploy to Render

1. This folder is already a GitHub repo. On Render: **New → Web Service**, pick the repo.
2. Settings:
   - Runtime: Python
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check path: `/healthz`
3. Environment variables: `DATABASE_URL`, `SESSION_SECRET`, `INITIAL_EMAIL`, `INITIAL_PASSWORD`, `BUSINESS_NAME`, `COOKIE_SECURE=true`.
   `render.yaml` in this repo sets most of this up as a blueprint.
4. Get the Postgres URL from [neon.tech](https://neon.tech) (free tier is fine) and paste it as `DATABASE_URL`.
5. Deploy, open the URL, sign in. Tables and the account are created automatically at startup, so there is no shell step.

Generate a `SESSION_SECRET` with `python -c "import secrets;print(secrets.token_urlsafe(48))"`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. `postgres://` and `postgresql://` prefixes are both accepted. |
| `SESSION_SECRET` | Signs the session cookie. Required in production. |
| `INITIAL_EMAIL` | Login email. Created on startup, or updated if it already exists. |
| `INITIAL_PASSWORD` | Login password. Replaced on every startup, so restarting with a new value changes the password. |
| `BUSINESS_NAME` | Store name used when the database is first created. |
| `CURRENCY_CODE` / `CURRENCY_LOCALE` | Currency defaults, e.g. `NGN` / `en-NG`. |
| `COOKIE_SECURE` | Set `true` when served over HTTPS so the cookie is Secure. |

## Layout

```
app/main.py           app setup, tables, first-run seed
app/models.py         SQLAlchemy models
app/routers/          dashboard, products, stock, sales, expenses, settings, auth
app/templates/        Jinja2 pages
app/static/app.css    styles
app/money.py          minor-unit money helpers
app/stock.py          stock level calculations
```

## Not included yet

- Roles and per-user permissions: any account created through `/signup` sees the whole store.
- Password reset by email (an owner can set a new `INITIAL_PASSWORD`, or you can add a reset flow).
- PDF invoices or receipts.
- Purchase orders and supplier payments.
- CSV import/export. The tables are plain Postgres, so you can query them directly meanwhile.

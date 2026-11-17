# Retail BI

A self-hosted retail dashboard: products, stock receipts, sales, expenses, and profit reporting.
Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

Nothing here depends on Base44. You own the code and the database.

## What it does

- **Dashboard** — sales today, sales this month, gross profit, net after expenses, 7-day revenue bars, top sellers, low-stock list, recent sales.
- **Products** — add, edit, archive; cost price, selling price, opening stock, reorder level, margin shown per row.
- **Stock** — receive stock (opening + receipts − sold), value on hand at cost, low-stock flags, receipt history. Receiving at a new unit cost updates the product cost price so profit stays honest.
- **Sales** — multi-line sale entry with discounts and optional tax, sequential references (`S-261117-001`), COGS and gross profit stored per sale.
- **Expenses** — dated expenses with category, payee, method, and spend-by-category breakdown.
- **Settings** — store name, currency code and locale, tax on/off and rate.

Money is stored as integer minor units (kobo/cents), so totals never drift from floating point.

## Run it locally

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, SESSION_SECRET, INITIAL_EMAIL, INITIAL_PASSWORD
npx prisma db push        # create the tables
npm run db:seed           # create your login + store settings
npm run dev               # http://localhost:3000
```

You need a Postgres database. Locally, the quickest is Docker:

```bash
docker run --name retail-pg -e POSTGRES_PASSWORD=pass -p 5432:5432 -d postgres:16
# DATABASE_URL="postgresql://postgres:pass@localhost:5432/postgres"
```

Generate a `SESSION_SECRET` with `openssl rand -base64 48`.

## Deploy to Render

1. Put this folder in a GitHub repo.
2. Create a free Postgres at [neon.tech](https://neon.tech) (or use Render Postgres) and copy its connection string.
3. On Render: **New → Web Service**, pick the repo.
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
4. Add environment variables: `DATABASE_URL`, `SESSION_SECRET`, `INITIAL_EMAIL`, `INITIAL_PASSWORD`, `BUSINESS_NAME`, `CURRENCY_CODE`, `CURRENCY_LOCALE`.
5. After the first deploy, open the Render Shell and run:
   ```bash
   npx prisma db push
   npm run db:seed
   ```
6. Open the service URL and sign in with `INITIAL_EMAIL` / `INITIAL_PASSWORD`.

`render.yaml` in this folder does steps 3 and 4 as a blueprint if you prefer that route.

## Changing your password

Re-run the seed with a new `INITIAL_PASSWORD`. It updates the existing account instead of creating a second one:

```bash
INITIAL_EMAIL="you@example.com" INITIAL_PASSWORD="new-password" npm run db:seed
```

## Things this build does not include

- Multiple staff accounts or roles (single login by design).
- PDF invoices or receipts.
- Supplier purchase orders and partial payments.
- CSV import/export, though the tables are plain Postgres if you want to query them directly.

Say the word and any of those can be added.

## Layout

```
prisma/schema.prisma    data model
prisma/seed.ts          first login + store settings
src/lib/                auth, money, stock, prisma client
src/app/(app)/          authenticated pages
src/app/api/sales       sale creation endpoint
src/components/         nav and sale form
```

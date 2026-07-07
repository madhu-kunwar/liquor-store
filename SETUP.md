# LiquorERP — Setup & Run Guide

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Docker Desktop (for PostgreSQL)

---

## 1. Install dependencies

```bash
pnpm install
```

---

## 2. Start PostgreSQL

```bash
docker-compose up -d
```

This starts PostgreSQL on **port 5433** (not 5432, to avoid conflicts with local Postgres).

---

## 3. Set up environment files

**`apps/api/.env`** (create if missing):
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/liquor_erp"
SHADOW_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/liquor_erp_shadow"
JWT_SECRET="liquorerp-super-secret-jwt-key-change-in-prod"
JWT_EXPIRES_IN="7d"
API_PORT=3005
FRONTEND_URL="http://localhost:3002"
```

**`apps/web/.env.local`** (create if missing):
```
NEXT_PUBLIC_API_URL=http://localhost:3005/v1
```

---

## 4. Apply the database schema

> **Note:** The project uses Prisma 7 (CLI 7.x). Prisma 7 changed how migrations work.
> Use the Prisma 5 CLI via npx to apply migrations (the client is still Prisma 7 compatible):

```bash
cd apps/api

# Option A — push schema directly (recommended for local dev, no migration history)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/liquor_erp" npx prisma@5 db push

# Option B — apply tracked migrations (use this if you want migration history)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/liquor_erp" npx prisma@5 migrate deploy
```

---

## 5. Seed the database

```bash
cd apps/api
pnpm tsx prisma/seed.ts
```

This creates the default admin account:
- **Email:** `admin@liquorerp.com`
- **Password:** `admin1234`

---

## 6. Generate the Prisma client

```bash
cd apps/api
npx prisma@5 generate
```

---

## 7. Start the app

```bash
# From repo root — starts both frontend and backend
pnpm dev
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3002       |
| API      | http://localhost:3005       |
| Swagger  | http://localhost:3005/docs  |

---

## Database tasks needed after recent schema changes

Two new columns were added as part of bug fixes. After running `db push` or `migrate deploy`, the schema will include:

1. **`StockMovement.createdBy`** — FK relation to `User` (was missing, caused runtime errors on `include: { createdBy: true }`)
2. **`SaleItem.costAtSale`** — nullable `Decimal` storing the variant's cost at the time of sale (for accurate historical COGS reporting)

Both are backward-compatible:
- The FK on `StockMovement` enforces referential integrity that the DB already had data for.
- `costAtSale` is nullable so existing sale rows remain valid (they'll fall back to current cost price in reports).

If `db push` fails due to existing data violating the new FK, run:
```sql
-- Check for orphaned stock movements (createdById with no matching user)
SELECT id FROM stock_movements WHERE created_by_id NOT IN (SELECT id FROM users);
```
If there are any, either fix the data or delete those rows before pushing.

---

## Re-seeding (if you reset the DB)

```bash
cd apps/api

# Wipe and recreate schema
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/liquor_erp" npx prisma@5 db push --force-reset

# Re-seed
pnpm tsx prisma/seed.ts
```

---

## Common commands

```bash
# Kill dev servers
pkill -f "next dev"
pkill -f "nest start"

# View DB in browser
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/liquor_erp" npx prisma@5 studio

# Test API with auth
TOKEN=$(curl -s -X POST http://localhost:3005/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@liquorerp.com","password":"admin1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
curl http://localhost:3005/v1/products -H "Authorization: Bearer $TOKEN"
```

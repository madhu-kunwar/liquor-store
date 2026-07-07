# CLAUDE.md — Project Context for AI Assistants

> Read this first when working on this codebase. It explains the layout, key
> decisions, gotchas, and patterns so you can be productive immediately.

---

## What this is

**LiquorERP** — modern inventory + store management ERP for liquor shops.
Monorepo with Next.js 15 frontend, NestJS backend, PostgreSQL.

User: a developer building this for a single liquor shop. Wants modern,
self-hosted, no per-seat SaaS fees, full ownership of data.

---

## Repo layout

```
liquor-erp/                          # monorepo root
├── apps/
│   ├── web/                         # Next.js 15 — port 3000
│   └── api/                         # NestJS 10 — port 3005
├── packages/shared/                 # Shared TS types
├── docker-compose.yml               # PostgreSQL on port 5433
├── README.md                        # Setup + run
├── FUNCTIONALITY.md                 # Deep dive on every feature
├── PLAN.md                          # Original research + roadmap
└── CLAUDE.md                        # ← This file
```

---

## Critical ports

| Service | Port |
|---|---|
| Frontend | **3000** |
| API | **3005** |
| PostgreSQL (Docker) | **5433** |

Changing these requires updating:
- `apps/web/package.json` dev script (`--port`)
- `apps/web/src/lib/api/index.ts` (baseURL)
- `.env` and `apps/api/.env` (DATABASE_URL, API_PORT, NEXT_PUBLIC_API_URL)

---

## Stack snapshot

**Frontend:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + Shadcn UI + Framer Motion + TanStack Query + React Hook Form + Zod + Recharts + Sonner + Lucide.

**Backend:** NestJS 10 + Prisma 7 + PostgreSQL 16 + JWT/Passport + bcryptjs + class-validator + Swagger + helmet + compression + @nestjs/schedule + @nestjs/event-emitter + @nestjs/throttler.

**Tooling:** Turborepo + pnpm workspaces + Docker Compose.

---

## Default credentials

`admin@liquorerp.com` / `admin1234` — seeded via `apps/api/prisma/seed.ts`.

---

## Database

12 models in `apps/api/prisma/schema.prisma`:
- `User` (3 roles: ADMIN, MANAGER, STAFF)
- `Category`, `Supplier`, `Product`, `ProductVariant`
- `StockMovement` (6 types: PURCHASE, SALE, ADJUSTMENT, WASTAGE, RETURN, TRANSFER)
- `PurchaseOrder` (5 statuses: DRAFT, SENT, PARTIAL_RECEIVED, RECEIVED, CANCELLED)
- `PurchaseOrderItem`
- `Sale`, `SaleItem` (3 payments: CASH, CARD, UPI)
- `AuditLog` (JSON old/new values)

**Key invariant:** A product can have multiple variants (case/pack/bottle/can/keg)
with different stock counts and prices. This is the killer feature for liquor retail.

**All stock changes go through `InventoryService.adjust()`** — guaranteed audit trail.

---

## Pages built (and their status)

Frontend at `http://localhost:3000`. All pages are wired to live API:

| Page | Hook(s) |
|---|---|
| `/login` | `POST /auth/login` → sets cookie |
| `/` (dashboard) | `useInventorySummary`, `useDailySummary`, `useStockMovements`, `useTopSellers`, `useInventoryValuation`, `useAlerts` |
| `/products` | `useProducts`, `useProduct`, `useDeleteProduct`, `useUpdateVariant` |
| `/products/new` | `useCreateProduct` |
| `/products/[id]` | `useProduct` |
| `/inventory` | `useStockMovements`, `useInventorySummary`, `useProductLedger`, `useAdjustStock` |
| `/purchase-orders` | `usePurchaseOrders`, `useCancelPurchaseOrder`, `useMarkAsSent` |
| `/purchase-orders/new` | `useCreatePurchaseOrder` |
| `/purchase-orders/[id]` | `usePurchaseOrder`, `useReceiveGoods` |
| `/suppliers` | `useSuppliers` |
| `/suppliers/new` | `useCreateSupplier` |
| `/suppliers/[id]` | `useSupplier` |
| `/sales` | `useSales`, `useDailySummary`, `useCreateSale`, `useVoidSale` |
| `/reports` | `useInventoryValuation`, `useLowStockReport`, `useDeadStockReport`, `useSalesSummary`, `useTopSellers` |
| `/alerts` | `useAlerts` |
| `/settings/users` | `useUsers`, `useUpdateUser`, `useCreateUser` |
| `/settings/categories` | `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory` |
| `/customers` | `useCustomers` |
| `/dealer-orders` | `useDealerOrders` |
| `/expenses` | `useExpenses`, `useExpenseSummary` |
| `/stock-in` | `useStockIn`, `useProducts`, `useSuppliers` |
| `/stock-register` | `useProductLedger`, `useStockMovements` |

---

## API status

All 38 routes registered. Tested live with JWT auth. Endpoints under `/v1/`:

`/auth/*`, `/users`, `/products`, `/categories`, `/suppliers`,
`/inventory/{movements,summary,adjust}`, `/purchase-orders/*`, `/sales/*`,
`/reports/{inventory-valuation,low-stock,dead-stock,sales-summary,stock-movements}`,
`/alerts/low-stock`, `/audit`.

Swagger UI: `http://localhost:3005/docs`.

---

## Known gotchas

### 1. Tailwind v4 quirk
Don't use `@tailwind base/components/utilities` (that's v3 syntax). Use:
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@custom-variant dark (&:is(.dark *));
```
Needs `postcss.config.mjs` with `@tailwindcss/postcss` plugin.

### 2. Charts use hex, NOT CSS variables
Tailwind v4 vars are `oklch(...)`. Recharts SVG can't parse `hsl(oklch(...))` —
renders all-black. **Always use direct hex** in chart files:
```ts
// ✅ Correct
const COLORS = { primary: "#f59e0b", green: "#10b981", blue: "#3b82f6" };
// ❌ Broken — looks like black on screen
fill="hsl(var(--chart-1))"
```

### 3. Prisma `lte: fields.X` is broken in 5.x
Don't write `where: { currentStock: { lte: prisma.productVariant.fields.reorderPoint } }`.
Fetch all active variants and filter in JS (see `alerts.service.ts`, `products.service.ts`).

### 4. compression + cookie-parser are CJS
In `main.ts` use `import * as compression from "compression"` and call as
`(compression as any)()`. Default import breaks at runtime.

### 5. Prisma shadow DB needs explicit URL
Set `SHADOW_DATABASE_URL` in `.env` + add `shadowDatabaseUrl` to schema.prisma's
`datasource db` block, OR use `prisma db push` instead of migrations.

### 6. Mobile sidebar
Uses shadcn `Sheet` for mobile. State held in `DashboardShell` client component
(`apps/web/src/components/layout/dashboard-shell.tsx`), passed down to both Header
(hamburger toggle) and Sidebar (open state). Desktop uses persistent collapsible aside.

### 7. Login sets cookie client-side
`apps/web/src/app/(auth)/login/page.tsx` hits the real `POST /auth/login` endpoint but
sets the JWT cookie client-side (`document.cookie = ...`) because the API is on a
different port so the server can't set an HttpOnly cookie cross-origin. This is fine
for the current single-machine setup — `middleware.ts` just checks for presence of `access_token`.

---

## User preferences

From conversation memory:
- **Never ask for permissions** — `~/.claude/settings.json` has `defaultMode: "bypassPermissions"`
- Prefer speed over verbose explanation
- Build things, don't keep asking "should I?"
- Use parallel tool calls everywhere
- Don't write summaries longer than needed

---

## Common commands

```bash
# Start everything
docker-compose up -d
pnpm dev

# Database
cd apps/api
pnpm prisma migrate dev          # apply pending migrations
pnpm prisma studio                # visual DB editor
pnpm tsx prisma/seed.ts           # re-seed
pnpm prisma db push               # if migrate fails on shadow DB

# Test API
TOKEN=$(curl -s -X POST http://localhost:3005/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@liquorerp.com","password":"admin1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
curl http://localhost:3005/v1/products -H "Authorization: Bearer $TOKEN"

# Kill servers
pkill -f "next dev"
pkill -f "nest start"
```

---

## Patterns to follow

### Adding a new API endpoint
1. Add DTO in `apps/api/src/modules/<feature>/dto/` (use `class-validator` decorators + `@ApiProperty`)
2. Add method to `<feature>.service.ts`
3. Add route to `<feature>.controller.ts` with `@ApiOperation`, guards, role decorators
4. Add hook to `apps/web/src/lib/hooks/use-<feature>.ts` using TanStack Query
5. Use the hook in the page component

### Adding a new page
1. Create `apps/web/src/app/(dashboard)/<route>/page.tsx`
2. Add to sidebar nav in `apps/web/src/components/layout/sidebar.tsx`
3. Wrap content in `motion.div` with entrance animation
4. Use shadcn components (`Card`, `Table`, `Button`, etc.)
5. Wrap tables in `<div className="overflow-x-auto">` for mobile

### Color usage
- **Amber** (`#f59e0b`) — primary brand, alerts, active states
- **Emerald** (`#10b981`) — success, stock-in, profits
- **Blue** (`#3b82f6`) — info, COGS, secondary actions
- **Purple** (`#8b5cf6`) — categories, less-prominent accents
- **Red** (`#ef4444` / rose) — destructive, out-of-stock, errors

### Animation patterns
```tsx
// Page entrance
<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>

// Staggered card list
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.08 + i * 0.05 }}
  >
))}
```

---

## Documentation hierarchy

- **`README.md`** — for new users running the project
- **`FUNCTIONALITY.md`** — deep feature explanations, file index
- **`PLAN.md`** — original market research + roadmap
- **`CLAUDE.md`** — (this) AI-assistant context, gotchas, patterns
- **`apps/web/FRONTEND_PLAN.md`** — frontend architecture decisions
- **`apps/api/BACKEND_PLAN.md`** — backend module breakdown

---

## When stuck

1. Check `/docs` (Swagger) for API shape
2. Check `apps/api/prisma/schema.prisma` for data model
3. Check `apps/web/src/lib/hooks/` for existing query patterns
4. Check `apps/web/src/components/ui/` for available shadcn components

Don't reinvent. Most patterns already exist somewhere in the repo.

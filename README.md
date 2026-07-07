# 🍷 LiquorERP — Liquor Shop Inventory & Store Management ()

> A modern, full-stack ERP system purpose-built for liquor retail stores.
> Track inventory in case/pack/bottle units, manage suppliers, run POs, record sales,
> get low-stock alerts, and analyze profitability — all from one beautiful dashboard.

![Stack](https://img.shields.io/badge/Next.js-15-black) ![Stack](https://img.shields.io/badge/NestJS-10-red) ![Stack](https://img.shields.io/badge/PostgreSQL-16-blue) ![Stack](https://img.shields.io/badge/Tailwind-v4-cyan) ![Stack](https://img.shields.io/badge/Prisma-5-darkgreen)

---

## 📚 Table of Contents

- [Quick Start](#-quick-start)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Detailed Setup](#-detailed-setup)
- [Available Scripts](#-available-scripts)
- [Default Credentials](#-default-credentials)
- [Architecture](#-architecture)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)
- [Documentation](#-documentation)

---

## ⚡ Quick Start

**Prerequisites:** Node.js ≥ 20, pnpm ≥ 9, Docker Desktop.

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL via Docker
docker-compose up -d

# 3. Run migrations + seed data
cd apps/api
pnpm prisma migrate dev
pnpm tsx prisma/seed.ts
cd ../..

# 4. Start everything
pnpm dev
```

Visit:
- **Frontend** → http://localhost:3002
- **API** → http://localhost:3005/v1
- **Swagger docs** → http://localhost:3005/docs
- **Database** → `localhost:5433` (postgres / postgres)

**Login:** `admin@liquorerp.com` / `admin1234`

---

## ✨ Features

### 📊 Dashboard
- 6 animated KPI cards (Total SKUs, Stock Value, Low Stock, Sales, Revenue, Pending POs)
- Live charts: Stock Movement (area), Sales by Category (donut), Top Products (bar)
- Low Stock Alert Panel with progress bars
- Recent Activity feed with timeline

### 📦 Product Catalog
- Full CRUD with searchable, filterable table
- **Multi-unit variants** — same product as Case (12 bottles), Pack (6 bottles), Bottle, Can, or Keg
- Barcode support per variant
- Cost price + selling price tracking with auto-margin calc
- Per-variant reorder points
- Soft-delete (deactivate, not delete)

### 📋 Inventory
- Full stock ledger of every movement (purchase, sale, adjustment, wastage, return, transfer)
- Manual stock adjustment dialog with mandatory reason
- Stock summary cards (total value, total variants, low stock count, out of stock)
- Automatic balance-after tracking on every movement

### 🏪 Suppliers
- Vendor CRUD with GST number, lead days, contact info
- Per-supplier detail page showing all linked products + recent PO history
- Avatar with initials, status indicator

### 🚚 Purchase Orders
- Multi-step PO creation: pick supplier → add line items → review total
- Auto-fills unit cost from variant's last known price
- **Goods Receiving workflow** — partial or full receipt, stock auto-increments
- Status tracking: Draft → Sent → Partial Received → Received → Cancelled
- Status-grouped tabs with counts
- Cancel before receipt

### 💰 Sales (POS-Lite)
- Quick sale dialog: search product → quantity → payment type
- Three payment methods: Cash, Card, UPI
- Auto-decrements stock with one transaction
- Void sale with reason — reverses stock automatically
- Daily summary (count + revenue)

### 📈 Reports
- **Inventory Valuation** — stock × cost = total value + potential revenue
- **Low Stock Report** — items below reorder point
- **Dead Stock Report** — no movement in N days (configurable)
- **Sales Summary** — revenue, COGS, gross profit, margin %
- **Stock Movement** — grouped by type with date range
- Revenue vs COGS bar chart (6 months)

### 🔔 Alerts
- Cron job runs hourly to detect low stock
- Event-driven notifications when stock drops below reorder
- Severity grouping: Critical (out of stock), High, Medium, Low (watch list)
- Per-item "Create PO" shortcut

### 🔐 Auth & Roles
- JWT-based with HttpOnly cookies (XSS-safe)
- 3 roles: **Admin** (full), **Manager** (CRUD), **Staff** (read + sales)
- Login, logout, session persistence
- User management page

### 🗂️ Categories
- Color-coded category management
- Inline color picker
- Linked product count

### 📤 Export
- Every list page exports to **Excel (.xlsx)** or **CSV**
- Auto-sized columns in Excel
- UTF-8 BOM in CSV (Excel-friendly for Indian characters)

### 🔍 Global Search
- `⌘K` / `Ctrl+K` / `/` opens command palette
- Searches across Pages, Products (with SKU), Purchase Orders
- Keyboard navigable

### 🎨 UI/UX
- **Dark-first** theme with light mode toggle
- Amber/gold accent (fitting for liquor brand)
- Framer Motion animations: page transitions, staggered cards, animated KPI counters, sidebar collapse spring, layout transitions
- **Fully mobile responsive** — hamburger sidebar drawer on mobile, overflow-scroll tables, stacked grids
- Shadcn UI components (22 primitives)
- Toast notifications (Sonner)

### 📝 Audit Trail
- Every mutation logged with user, action, entity, old/new JSON values, IP address
- Searchable audit log for Admin + Manager roles

---

## 🛠️ Tech Stack

### Frontend
| Library | Purpose |
|---|---|
| **Next.js 15** | App Router, Server Components, Server Actions |
| **React 19** | Latest with concurrent rendering |
| **TypeScript 5** | End-to-end type safety |
| **Tailwind CSS v4** | Utility-first styling with CSS-first config |
| **Shadcn UI** | Radix-based unstyled primitives |
| **Framer Motion v11** | All animations and transitions |
| **TanStack Query v5** | Server state, caching, optimistic updates |
| **React Hook Form** | Performant uncontrolled forms |
| **Zod** | Schema validation (shared with backend DTOs) |
| **Recharts** | Composable data visualization |
| **Sonner** | Toast notifications |
| **Lucide React** | Icon library |
| **next-themes** | Dark/light mode persistence |
| **xlsx** | Excel export |
| **axios** | HTTP client with interceptors |

### Backend
| Library | Purpose |
|---|---|
| **NestJS 10** | Modular framework with DI + decorators |
| **Prisma 7** | Type-safe ORM with migrations |
| **PostgreSQL 16** | ACID-compliant relational DB |
| **JWT + Passport** | Auth strategies (local + jwt) |
| **bcryptjs** | Password hashing |
| **class-validator** | DTO validation |
| **@nestjs/swagger** | Auto-generated OpenAPI docs |
| **@nestjs/schedule** | Cron jobs (low stock checks) |
| **@nestjs/event-emitter** | Domain events |
| **@nestjs/throttler** | Rate limiting (100 req/min) |
| **Helmet + Compression** | Security + performance middleware |

### DevOps
| Tool | Purpose |
|---|---|
| **Turborepo** | Monorepo build orchestration |
| **pnpm** | Fast disk-efficient package manager |
| **Docker Compose** | Local PostgreSQL container |

---

## 📁 Project Structure

```
liquor-erp/
├── apps/
│   ├── web/                            # Next.js 15 frontend (port 3002)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/             # Public routes
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   └── (dashboard)/        # Protected routes (sidebar layout)
│   │   │   │       ├── page.tsx        # Dashboard home
│   │   │   │       ├── products/
│   │   │   │       │   ├── page.tsx    # List
│   │   │   │       │   ├── new/        # Create form
│   │   │   │       │   └── [id]/       # Detail + edit
│   │   │   │       ├── inventory/      # Stock ledger + adjustments
│   │   │   │       ├── purchase-orders/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   ├── new/        # Multi-step PO form
│   │   │   │       │   └── [id]/       # Detail + Receive Goods modal
│   │   │   │       ├── suppliers/
│   │   │   │       ├── sales/          # POS-lite + history
│   │   │   │       ├── reports/        # Tabbed analytics
│   │   │   │       ├── alerts/         # Low stock alerts
│   │   │   │       └── settings/
│   │   │   │           ├── users/      # Role management
│   │   │   │           └── categories/ # CRUD with color picker
│   │   │   ├── components/
│   │   │   │   ├── ui/                 # 22 shadcn primitives
│   │   │   │   ├── layout/
│   │   │   │   │   ├── dashboard-shell.tsx
│   │   │   │   │   ├── sidebar.tsx     # Desktop + mobile Sheet drawer
│   │   │   │   │   └── header.tsx
│   │   │   │   ├── modules/dashboard/  # KPI cards, charts, activity feed
│   │   │   │   └── shared/
│   │   │   │       ├── theme-provider.tsx
│   │   │   │       ├── query-provider.tsx
│   │   │   │       ├── global-search.tsx       # ⌘K palette
│   │   │   │       └── export-button.tsx       # CSV/Excel export
│   │   │   ├── lib/
│   │   │   │   ├── api/index.ts        # axios client + interceptors
│   │   │   │   ├── hooks/              # 8 TanStack Query hook files
│   │   │   │   ├── utils/              # cn, format, export utilities
│   │   │   │   └── validations/        # Zod schemas for forms
│   │   │   ├── types/                  # TypeScript interfaces
│   │   │   ├── middleware.ts           # JWT cookie auth check
│   │   │   └── ...
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── components.json             # Shadcn config
│   │   └── FRONTEND_PLAN.md
│   │
│   └── api/                            # NestJS backend (port 3005)
│       ├── src/
│       │   ├── main.ts                 # Bootstrap, middleware, Swagger
│       │   ├── app.module.ts           # Root module
│       │   ├── common/
│       │   │   ├── prisma/             # Global PrismaService + Module
│       │   │   ├── guards/             # JwtAuthGuard, RolesGuard
│       │   │   ├── decorators/         # @CurrentUser, @Roles
│       │   │   └── filters/            # Global exception filter
│       │   └── modules/
│       │       ├── auth/               # JWT + local strategies
│       │       ├── users/              # User CRUD + role management
│       │       ├── products/           # Catalog + variants
│       │       ├── inventory/          # Stock movements + adjustments
│       │       ├── suppliers/          # Vendor CRUD
│       │       ├── purchase-orders/    # PO lifecycle
│       │       ├── sales/              # Sale create + void
│       │       ├── reports/            # Analytics queries
│       │       ├── alerts/             # Cron + event listeners
│       │       ├── audit/              # Audit log
│       │       └── categories/         # Category CRUD
│       ├── prisma/
│       │   ├── schema.prisma           # 12 models, 5 enums
│       │   ├── seed.ts                 # Admin user + categories + sample product
│       │   └── migrations/
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env                        # Local environment
│       └── BACKEND_PLAN.md
│
├── packages/
│   └── shared/                         # Shared TS types + constants
│       └── src/
│           ├── types/                  # Cross-app TypeScript interfaces
│           └── constants/              # Shared enums/labels
│
├── docker-compose.yml                  # PostgreSQL container
├── .env                                # Root env (NEXT_PUBLIC_API_URL, JWT_SECRET)
├── .env.example                        # Template
├── pnpm-workspace.yaml                 # Workspace config
├── turbo.json                          # Turborepo pipeline
├── package.json                        # Root scripts
├── PLAN.md                             # Original implementation plan
├── FUNCTIONALITY.md                    # Deep functionality docs
└── README.md                           # This file
```

---

## 🔧 Detailed Setup

### Step 1 — Install Node and pnpm

```bash
# macOS via Homebrew
brew install node pnpm

# Verify versions
node --version    # Should be ≥ 20
pnpm --version    # Should be ≥ 9
```

### Step 2 — Start PostgreSQL

The project uses Docker for a clean, isolated database. **PostgreSQL runs on port 5433**
(not 5432) to avoid conflicts with any local Postgres install.

```bash
docker-compose up -d
```

Verify it's running:
```bash
docker ps | grep liquor_erp_db
docker exec liquor_erp_db psql -U postgres -c "SELECT version();"
```

### Step 3 — Install dependencies

From the project root:
```bash
pnpm install
```

This installs dependencies for all workspaces (web, api, shared) using pnpm's
hoisted node_modules structure (~800 packages).

### Step 4 — Run database migrations

```bash
cd apps/api
pnpm prisma migrate dev --name init
```

This creates all 12 tables: users, categories, suppliers, products, product_variants,
stock_movements, purchase_orders, purchase_order_items, sales, sale_items, audit_logs,
and _prisma_migrations.

### Step 5 — Seed the database

```bash
pnpm tsx prisma/seed.ts
# Or:
npx ts-node prisma/seed.ts
```

This creates:
- 1 admin user: `admin@liquorerp.com` / `admin1234`
- 6 categories: Whiskey, Vodka, Beer, Wine, Rum, Gin
- 1 supplier: Premium Beverages Ltd
- 1 sample product (JW Black Label) with 2 variants (bottle + case)

### Step 6 — Start both apps

From the project root:
```bash
pnpm dev
```

This uses Turborepo to start both apps in parallel:
- **Web** → http://localhost:3002
- **API** → http://localhost:3005
- **Swagger** → http://localhost:3005/docs

### Step 7 — Login

Open http://localhost:3002 — you'll be redirected to `/login`. Credentials are
pre-filled. Click **Sign in** to enter the dashboard.

---

## 📜 Available Scripts

From the project root:

| Command | Description |
|---|---|
| `pnpm dev` | Start both web + API in parallel |
| `pnpm build` | Production build for both apps |
| `pnpm lint` | Lint all workspaces |
| `pnpm type-check` | TypeScript check all workspaces |
| `pnpm db:migrate` | Apply pending Prisma migrations |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:studio` | Open Prisma Studio (visual DB editor) |

From `apps/web/`:
```bash
pnpm dev      # Next.js dev server (port 3002)
pnpm build    # Production build
pnpm start    # Run production build
```

From `apps/api/`:
```bash
pnpm dev      # NestJS watch mode (port 3005)
pnpm build    # Compile TypeScript
pnpm db:seed  # Re-seed the database
pnpm db:reset # Drop + recreate + migrate + seed
```

---

## 🔑 Default Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@liquorerp.com` | `admin1234` |

To add more users, go to **Settings → Users** and click **Invite User**.

### Roles & Permissions

| Action | Admin | Manager | Staff |
|---|:---:|:---:|:---:|
| View dashboard, products, etc. | ✓ | ✓ | ✓ |
| Create/edit products & suppliers | ✓ | ✓ | ✗ |
| Create POs & receive goods | ✓ | ✓ | ✓ |
| Record sales | ✓ | ✓ | ✓ |
| Void sales | ✓ | ✓ | ✗ |
| Manage users | ✓ | ✗ | ✗ |
| Delete (anything) | ✓ | ✗ | ✗ |
| View audit log | ✓ | ✓ | ✗ |

---

## 🏗️ Architecture

### Request Flow

```
Browser (Next.js, port 3002)
   ↓
Middleware checks access_token cookie
   ↓
TanStack Query hook (e.g. useProducts)
   ↓
axios → http://localhost:3005/v1/products
   ↓
NestJS API
   ├─ JwtAuthGuard validates token from cookie/header
   ├─ RolesGuard checks user role permissions
   ├─ ValidationPipe validates DTO (class-validator + Zod)
   └─ Controller → Service → Prisma → PostgreSQL
   ↓
Response → axios → Query cache → React render
```

### Why this stack?

| Decision | Rationale |
|---|---|
| **Next.js 15 + NestJS** (not single Next.js backend) | Separation lets backend scale independently; Nest gives proper DI, modules, decorators for ERP scale |
| **Prisma over TypeORM** | Better DX, type-safe queries, predictable migrations |
| **PostgreSQL over MySQL** | ACID for financial accuracy, JSON columns for audit log payloads |
| **JWT in HttpOnly cookie** (not localStorage) | XSS-safe; browser auto-includes cookie on requests |
| **TanStack Query** (not Redux/Zustand for server data) | Auto-caching, refetch on focus, optimistic updates, no boilerplate |
| **Shadcn UI** (not Material/Chakra) | Code lives in your repo, fully customizable, no version lock-in |
| **Tailwind v4** (CSS-first) | Faster builds, simpler config, OKLCH color space |
| **Monorepo with Turborepo** | Share types between web + api, single `pnpm install` |
| **Soft delete via `isActive: false`** | Preserves historical references in audit log, sales, POs |

### Key patterns

- **Modular NestJS** — each feature in its own module with controller, service, DTOs
- **DTO validation** — `class-validator` decorators on all incoming bodies
- **Audit logging** — every mutation goes through `AuditService.log()`
- **Event-driven alerts** — `EventEmitter2` fires `stock.low` event, AlertsService listens
- **Hourly cron** — `@Cron(EVERY_HOUR)` sweeps low stock
- **Cookie-based auth + bearer fallback** — JWT strategy reads from both
- **Optimistic UI** — TanStack Query auto-invalidates on mutation success

---

## 📖 API Documentation

Full interactive Swagger UI: **http://localhost:3005/docs**

### Auth endpoints
| Method | Path | Notes |
|---|---|---|
| POST | `/v1/auth/login` | `{ email, password }` → JWT cookie + token |
| POST | `/v1/auth/logout` | Clears cookie |
| GET | `/v1/auth/me` | Current user |

### Core resources
| Resource | List | Create | Get | Update | Delete |
|---|---|---|---|---|---|
| Products | `GET /v1/products` | `POST /v1/products` | `GET /v1/products/:id` | `PATCH /v1/products/:id` | `DELETE /v1/products/:id` |
| Suppliers | `GET /v1/suppliers` | `POST /v1/suppliers` | `GET /v1/suppliers/:id` | `PATCH /v1/suppliers/:id` | `DELETE /v1/suppliers/:id` |
| Categories | `GET /v1/categories` | `POST /v1/categories` | — | `PATCH /v1/categories/:id` | `DELETE /v1/categories/:id` |
| Users | `GET /v1/users` | `POST /v1/users` | — | `PATCH /v1/users/:id` | — |
| Purchase Orders | `GET /v1/purchase-orders` | `POST /v1/purchase-orders` | `GET /v1/purchase-orders/:id` | — | — |
| Sales | `GET /v1/sales` | `POST /v1/sales` | — | — | — |

### Special operations
| Method | Path | Notes |
|---|---|---|
| `POST` | `/v1/purchase-orders/:id/receive` | Receive goods (partial or full), auto-updates stock |
| `POST` | `/v1/purchase-orders/:id/cancel` | Cancel a PO |
| `POST` | `/v1/sales/:id/void` | Void sale with reason, reverses stock |
| `POST` | `/v1/inventory/adjust` | Manual stock adjustment |
| `GET` | `/v1/inventory/summary` | Total value + low stock count |
| `GET` | `/v1/sales/daily-summary` | Today's count + revenue |
| `GET` | `/v1/reports/inventory-valuation` | Stock × cost report |
| `GET` | `/v1/reports/low-stock` | Items below reorder |
| `GET` | `/v1/reports/dead-stock?days=60` | No movement in N days |
| `GET` | `/v1/reports/sales-summary?dateFrom=...&dateTo=...` | Revenue, COGS, gross profit |
| `GET` | `/v1/alerts/low-stock` | Cron-detected low stock |
| `GET` | `/v1/audit` | Audit log (paginated) |

---

## 🐞 Troubleshooting

### "Port 3000 is already in use"
Frontend is configured to run on **port 3002**. If something else is on 3002:
```bash
PORT=3010 pnpm dev    # from apps/web
```

### "Port 3001 already in use"
API is configured to run on **port 3005**. If you change it, update:
- `apps/api/.env` → `API_PORT=NNNN`
- `.env` (root) → `NEXT_PUBLIC_API_URL="http://localhost:NNNN"`

### "P1010: User postgres was denied access"
A local Homebrew Postgres might be intercepting port 5432. We map Docker to **5433**.
If you run into this, verify:
```bash
docker port liquor_erp_db        # Should show 5433
psql -h localhost -p 5433 -U postgres -d liquor_erp -c "SELECT 1;"
```

### "Cannot find module @prisma/client"
Regenerate the Prisma client:
```bash
cd apps/api && pnpm prisma generate
```

### Charts showing all black
Tailwind v4 uses `oklch()` CSS variables. Recharts SVG can't parse `hsl(oklch(...))`,
so chart files use direct hex colors (`#f59e0b`, etc.) — that's intentional.

### Login redirect loop
Clear cookies for `localhost:3002` and try again. The middleware checks for the
`access_token` cookie — if it's stale, middleware bounces you to `/login`.

### Tailwind classes not applying
Check that:
- `apps/web/postcss.config.mjs` exists with `@tailwindcss/postcss`
- `globals.css` starts with `@import "tailwindcss";` (not `@tailwind base;`)
- Dev server restarted after CSS config changes

---

## 📑 Documentation

| File | Description |
|---|---|
| [README.md](./README.md) | This file — quickstart, features, run instructions |
| [FUNCTIONALITY.md](./FUNCTIONALITY.md) | Deep dive: how every feature works, why decisions were made, complete file index |
| [PLAN.md](./PLAN.md) | Original market research + implementation roadmap |
| [apps/web/FRONTEND_PLAN.md](./apps/web/FRONTEND_PLAN.md) | Frontend architecture decisions |
| [apps/api/BACKEND_PLAN.md](./apps/api/BACKEND_PLAN.md) | Backend architecture, modules, patterns |

---

## 📞 Ports Reference

| Service | Port | URL |
|---|---|---|
| Frontend (Next.js) | 3002 | http://localhost:3002 |
| API (NestJS) | 3005 | http://localhost:3005/v1 |
| Swagger Docs | 3005 | http://localhost:3005/docs |
| PostgreSQL | 5433 | `postgresql://postgres:postgres@localhost:5433/liquor_erp` |

---

## 🚧 Roadmap

- [x] Full UI for all 9 modules
- [x] All backend modules and routes
- [x] Database schema and migrations
- [x] JWT auth with role-based guards
- [x] Mobile responsive
- [x] CSV + Excel export
- [x] Global search (⌘K)
- [x] Forms for create flows (products, POs, suppliers)
- [ ] Wire all list pages to live API hooks (currently using mock data)
- [ ] Connect login to real `/auth/login` endpoint
- [ ] Add product image upload to S3/Cloudinary
- [ ] Real-time updates via WebSockets
- [ ] Barcode scanner integration (mobile camera)
- [ ] Multi-location/warehouse support
- [ ] AI-powered demand forecasting
- [ ] React Native mobile app

---

**Built with ❤️ for liquor retailers who deserve modern software.**
# liquor
# liqourerp

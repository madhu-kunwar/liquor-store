# LiquorERP — Full Functionality Documentation

> How every feature works, why it was built that way, and where to find the code.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Dashboard](#3-dashboard)
4. [Product Catalog](#4-product-catalog)
5. [Inventory Management](#5-inventory-management)
6. [Suppliers](#6-suppliers)
7. [Purchase Orders](#7-purchase-orders)
8. [Sales (POS-Lite)](#8-sales-pos-lite)
9. [Reports & Analytics](#9-reports--analytics)
10. [Alerts](#10-alerts)
11. [Categories](#11-categories)
12. [Users & Roles](#12-users--roles)
13. [Audit Trail](#13-audit-trail)
14. [Global Search](#14-global-search)
15. [Export (CSV / Excel)](#15-export-csv--excel)
16. [Theme & UI](#16-theme--ui)
17. [Mobile Responsiveness](#17-mobile-responsiveness)
18. [Cross-Cutting Concerns](#18-cross-cutting-concerns)
19. [Complete File Index](#19-complete-file-index)

---

## 1. System Overview

### What it is
A modern, self-hosted ERP system for liquor retail stores. Tracks products in
multiple units (case/pack/bottle), manages suppliers, runs purchase orders,
records sales, generates analytics, and pages staff when stock runs low.

### Architecture
- **Monorepo** (Turborepo + pnpm workspaces) so types are shared between frontend and backend.
- **Frontend** (Next.js 15) — server-rendered, fully client-interactive dashboard.
- **Backend** (NestJS 10) — modular REST API with versioning, Swagger, auth.
- **Database** (PostgreSQL 16 in Docker) — relational, ACID, audit-friendly.
- **ORM** (Prisma 7) — type-safe queries + migrations.

### Why this stack
| Decision | Why |
|---|---|
| Separate Next.js + NestJS | Scale independently. Nest's DI, modules, decorators built for ERP scale. |
| Prisma over TypeORM | Better DX in 2026, predictable migrations, type-safe at the edges. |
| PostgreSQL over MySQL | ACID for financial accuracy. JSON columns for audit payloads. |
| JWT in HttpOnly cookie | XSS-safe. Browser auto-attaches on requests. |
| TanStack Query | No Redux boilerplate. Auto-caching, optimistic updates. |
| Shadcn UI | Code lives in your repo. No version lock. Fully customizable. |
| Tailwind v4 | Faster builds, CSS-first config, OKLCH colors. |
| Monorepo | Share types between web/api with zero duplication. |

---

## 2. Authentication & Authorization

### What it does
- Email/password login
- Session via JWT in HttpOnly cookie (also accepts `Authorization: Bearer` header)
- 3 roles: ADMIN, MANAGER, STAFF — enforced by guards on the backend
- Middleware on the frontend redirects unauthenticated users to `/login`

### How it works
1. User submits credentials at `/login` (`apps/web/src/app/(auth)/login/page.tsx`)
2. Backend `POST /v1/auth/login` validates via `LocalStrategy` (`apps/api/src/modules/auth/strategies/local.strategy.ts`)
3. `AuthService.validateUser()` uses `bcrypt.compare()` to check password hash
4. `AuthService.login()` signs JWT and `AuthController` sets it as `HttpOnly` cookie
5. Every protected request goes through `JwtAuthGuard` (`apps/api/src/common/guards/jwt-auth.guard.ts`)
6. `JwtStrategy` extracts token from cookie OR `Authorization` header (`apps/api/src/modules/auth/strategies/jwt.strategy.ts`)
7. `@Roles(Role.ADMIN)` decorator + `RolesGuard` restrict mutations to certain roles

### Frontend protection
- `apps/web/src/middleware.ts` — Next.js middleware runs on every request
- If no `access_token` cookie → redirect to `/login`
- If token exists and user visits `/login` → redirect to `/`

### Why
HttpOnly cookies cannot be read by JS, defending against XSS. Stateless JWTs let the API scale horizontally. Three-role model balances simplicity with realistic shop hierarchy (owner, manager, cashier).

---

## 3. Dashboard

### What it does
Single-glance view of business health:
- 6 KPI cards: Total SKUs, Stock Value, Low Stock count, Today's Sales, Today's Revenue, Pending POs
- Stock Movement chart (area chart — inflow vs outflow last 7 days)
- Sales by Category donut chart
- Top Products bar chart
- Low Stock alert panel with progress bars
- Recent Activity feed (last 6 stock movements)

### How it works
- `apps/web/src/components/modules/dashboard/dashboard-page.tsx` — composition root
- `kpi-card.tsx` — animated counter using `requestAnimationFrame` with cubic ease-out
- `stock-chart.tsx` — Recharts `AreaChart` with gradient fills
- `sales-chart.tsx` — Recharts `PieChart` with inner radius for donut effect
- `top-products.tsx` — horizontal `BarChart`
- `low-stock-panel.tsx` — progress bars showing `current / reorder`
- `recent-activity.tsx` — scroll area with timeline avatars per movement type

### Why
Operators stay in this view for hours. The dashboard shows actionable information immediately. Animated counters make the data feel alive. Color-coded categories help pattern recognition.

---

## 4. Product Catalog

### What it does
- List view with search, category filter, status filter
- Create product with multiple variants in one form
- Detail page showing all variants, stock per variant, value per variant
- Edit + soft-delete (deactivate, not destroy — preserves audit trail)

### Multi-unit variants
The killer liquor-specific feature. A single product like "Johnnie Walker Black Label" can have:
- 1 × Bottle (750ml)
- 1 × Case (12 bottles)
- 1 × Pack (6 bottles)

Each variant has its own cost, sell price, stock count, reorder point. The schema stores them in `product_variants` linked to `products`.

### How it works
- List: `apps/web/src/app/(dashboard)/products/page.tsx`
- Create: `apps/web/src/app/(dashboard)/products/new/page.tsx`
  - Uses React Hook Form's `useFieldArray` for the dynamic variants list
  - Zod schema validates on submit (`apps/web/src/lib/validations/product.ts`)
  - Calls `useCreateProduct()` hook from `apps/web/src/lib/hooks/use-products.ts`
- Detail: `apps/web/src/app/(dashboard)/products/[id]/page.tsx`
  - Uses `useProduct(id)` hook to fetch from `/v1/products/:id`
  - Shows variants table with stock status badge per row

### Backend
- `apps/api/src/modules/products/products.service.ts`
  - `create()` destructures `variants` from DTO, creates with nested `create`
  - `findAll()` supports search across name/brand/SKU, paginated
  - `getLowStockVariants()` returns all variants where `currentStock <= reorderPoint`

### Why
Liquor stores literally manage the same SKU in 3 forms — bottle (single), pack (6), case (12). Apps that ignore this force staff to do mental math every time. Per-variant reorder points mean you can reorder cases before you run out, even if single bottles are full.

---

## 5. Inventory Management

### What it does
- Full ledger of every stock movement (immutable audit trail)
- Manual stock adjustment dialog with mandatory reason
- 6 movement types: PURCHASE, SALE, ADJUSTMENT, WASTAGE, RETURN, TRANSFER
- Summary cards: total value, total variants, low stock count, out of stock

### How it works
Every stock change goes through one path: `InventoryService.adjust()` (`apps/api/src/modules/inventory/inventory.service.ts`).

```
adjust({ variantId, quantity, type, reason }) {
  - Look up current variant
  - newStock = currentStock + quantity (negative for outflows)
  - Reject if newStock < 0
  - Transaction:
      - UPDATE product_variants SET currentStock = newStock
      - INSERT stock_movements (variantId, type, quantity, balanceAfter, reason, userId)
  - If newStock <= reorderPoint:
      - eventEmitter.emit('stock.low', payload)
}
```

This guarantees:
- You can never have negative stock
- Every movement is logged with who, when, why
- `balanceAfter` is captured immutably (auditors love this)
- Low stock automatically triggers alerts

### Frontend
- `apps/web/src/app/(dashboard)/inventory/page.tsx` — movements table + adjustment dialog
- Dialog requires reason — prevents "ghost" adjustments

### Why
Liquor stores lose 2–4% of revenue to shrinkage. The only defense is making every movement traceable. The mandatory reason field forces staff to think before clicking. The immutable `balanceAfter` field means you can reconstruct stock history at any point in time for a count audit.

---

## 6. Suppliers

### What it does
- CRUD on supplier records with GST number, lead days, contact info
- Detail page showing linked products + recent PO history
- Soft-delete (deactivate)

### How it works
- List: `apps/web/src/app/(dashboard)/suppliers/page.tsx`
- Create: `apps/web/src/app/(dashboard)/suppliers/new/page.tsx`
- Detail: `apps/web/src/app/(dashboard)/suppliers/[id]/page.tsx`
- Hooks: `apps/web/src/lib/hooks/use-suppliers.ts`
- Backend: `apps/api/src/modules/suppliers/suppliers.service.ts`
- The `_count: { products, purchaseOrders }` Prisma select returns counts without loading full relations

### Why
The supplier is the source of truth for purchase orders. Avg lead days drives reorder timing. The GST field is required for Indian tax compliance. Soft-delete preserves the link to historical POs.

---

## 7. Purchase Orders

### What it does
Full PO lifecycle:
- **Draft** → just saved, no commitment
- **Sent** → sent to supplier, awaiting goods
- **Partial Received** → some items received, some pending
- **Received** → fully fulfilled
- **Cancelled** → killed before completion

Multi-step creation:
1. Pick supplier
2. Add line items (variant + qty + unit cost, auto-fills from variant's last cost)
3. See live order total
4. Submit

Goods Receiving workflow:
1. Open PO detail
2. Click "Receive Goods"
3. Enter received quantity per line item (can be less than ordered for partial)
4. Click Confirm → stock auto-increments, status auto-updates

### How it works
- List: `apps/web/src/app/(dashboard)/purchase-orders/page.tsx` — Kanban tabs by status
- Create: `apps/web/src/app/(dashboard)/purchase-orders/new/page.tsx`
  - Uses `useFieldArray` for line items
  - Watches all `unitCost × orderedQty` for live total
- Detail: `apps/web/src/app/(dashboard)/purchase-orders/[id]/page.tsx`
  - Receive Goods Dialog with qty input per item
  - Shows received vs ordered vs remaining per line

### Backend
- `apps/api/src/modules/purchase-orders/purchase-orders.service.ts`
- `create()` calculates total, generates PO number (timestamp-based)
- `receiveGoods()`:
  - For each item, increment `receivedQty`
  - Call `inventoryService.adjust()` with type `PURCHASE`, references PO number
  - After all items: if `every(receivedQty >= orderedQty)` → RECEIVED, else PARTIAL_RECEIVED
- `cancel()` — rejects if already RECEIVED

### Why
Real shops receive goods in pieces. A truck might arrive with 80% of what was ordered — the missing 20% comes next week. Partial receipt support is non-negotiable. Routing all stock changes through `inventoryService.adjust()` means goods receipt creates the same audit trail as a manual adjustment — auditors get one source of truth.

---

## 8. Sales (POS-Lite)

### What it does
- Quick sale dialog: search product → quantity → payment type (Cash/Card/UPI) → confirm
- Stock auto-decrements on sale
- Void sale with reason — stock auto-restores
- Daily summary card (today's count + revenue)
- Full sale history

### How it works
- `apps/web/src/app/(dashboard)/sales/page.tsx`
- New Sale dialog uses cart pattern: array of items with qty + unit price
- Live cart total at the bottom
- Three payment buttons styled to show selected state

### Backend
- `apps/api/src/modules/sales/sales.service.ts`
- `create(dto, userId)`:
  - For each item: check variant stock, reject if insufficient
  - Transaction: create sale, create sale items (calculates totalPrice from qty × unitPrice)
  - For each item: call `inventoryService.adjust({ quantity: -qty, type: SALE })`
- `void(id, reason, userId)`:
  - Mark `isVoided: true`, store void reason
  - For each item: `inventoryService.adjust({ quantity: +qty, type: RETURN })` to restore stock

### Why
A liquor shop already has a real POS (Clover, Square, etc.). This POS-lite handles the cases the real POS misses — sales rung up by a manager outside business hours, void corrections, supplier returns. By routing through the same `inventoryService.adjust()`, every sale and void shows up in the inventory ledger.

---

## 9. Reports & Analytics

### What it does
4 tabbed reports:
- **Inventory Valuation** — every variant with qty × cost = stock value, plus potential revenue (qty × sell)
- **Sales Summary** — date range filter, computes revenue, COGS, gross profit, gross margin %
- **Low Stock** — items at or below reorder
- **Dead Stock** — no movement in N days (default 60)

Plus a Revenue vs COGS bar chart (6 months).

### How it works
- Frontend: `apps/web/src/app/(dashboard)/reports/page.tsx`
- Backend: `apps/api/src/modules/reports/reports.service.ts`
- `inventoryValuation()` — pulls all variants, computes per-row `totalValue` and `potentialRevenue`
- `salesSummary(from, to)` — sums sale totalAmount as revenue, sums cost × qty across all sale items as COGS, derives gross profit + margin
- `deadStockReport(days)` — finds variants with no `stock_movements` in past N days

### Why
Margin matters. A 5% net margin means a 1% reduction in shrinkage or dead stock is a 20% increase in take-home profit. Reports surface what's invisible in day-to-day operations.

---

## 10. Alerts

### What it does
- Hourly cron job sweeps all variants for low stock
- Event-driven alerts fire instantly when a sale/adjustment drops stock below reorder
- Alerts page groups by severity: Critical (out of stock), High, Medium, Low
- Per-alert "Create PO" shortcut

### How it works
- `apps/api/src/modules/alerts/alerts.service.ts`
- `@Cron(CronExpression.EVERY_HOUR)` decorator → NestJS schedules `checkLowStock()`
- `@OnEvent('stock.low')` → listens for events fired by `inventoryService.adjust()`
- `getLowStockAlerts()` returns variants where `currentStock <= reorderPoint`

### Frontend
- `apps/web/src/app/(dashboard)/alerts/page.tsx`
- Each alert shows progress bar of `current / reorder`, severity badge, supplier name
- Quick action buttons: "Create PO" (jumps to PO form with supplier pre-filled) and "Dismiss"

### Why
Stock-outs lose immediate sales. Overstock ties up capital. Reorder points are the simplest defense — but only if someone actually sees the alerts. By combining hourly checks (catches gradual decline) with event-driven instant alerts (catches sudden drops), nothing slips through.

---

## 11. Categories

### What it does
- CRUD with color picker
- Linked product count
- Color shows up everywhere a category appears (badges on products, charts)

### How it works
- Frontend: `apps/web/src/app/(dashboard)/settings/categories/page.tsx`
- Backend: `apps/api/src/modules/categories/categories.service.ts`
- Color stored as hex string in `categories.color` column
- Used as `background` style on category badge components

### Why
Visual grouping makes scanning faster. Color = instant recognition.

---

## 12. Users & Roles

### What it does
- Invite users with email + role
- View all users with last-seen, role badge, status
- Activate/deactivate users
- Change roles (Admin only)

### How it works
- Frontend: `apps/web/src/app/(dashboard)/settings/users/page.tsx`
- Backend: `apps/api/src/modules/users/users.service.ts`
- Passwords hashed with `bcrypt` (cost factor 12)
- Email uniqueness enforced at DB level

### Role enforcement
- `@Roles(Role.ADMIN, Role.MANAGER)` decorator on controllers
- `RolesGuard` reads metadata and rejects mismatched roles
- Frontend should hide UI for actions the user can't perform (not yet wired)

### Why
A shop has an owner, a manager, and cashiers. Each needs different access. STAFF should record sales but not change prices. MANAGER can edit products but not delete users. ADMIN can do everything.

---

## 13. Audit Trail

### What it does
- Every mutation logged: who, when, what, old value, new value
- Searchable by entity (product, supplier, etc.) or user
- IP address captured

### How it works
- `apps/api/src/modules/audit/audit.service.ts`
- `AuditService.log({ userId, action, entity, entityId, oldValue, newValue, ipAddress })`
- Called from any service after a mutation
- Stored in `audit_logs` table with JSON columns for old/new values

### Why
Compliance. Insurance. Trust. When inventory comes up 12 bottles short, the audit log shows exactly who adjusted what and why.

---

## 14. Global Search

### What it does
- `⌘K` / `Ctrl+K` / `/` opens command palette
- Searches across Pages, Products (by name + SKU), Purchase Orders, Settings
- Keyboard navigable (↑↓ to move, Enter to open, Esc to close)
- Showing recent items even with no query

### How it works
- `apps/web/src/components/shared/global-search.tsx`
- Built on shadcn's `Command` (which wraps `cmdk`)
- Wired into the header as the search bar — clicking opens the dialog
- Keyboard listener registered on mount via `useEffect`

### Why
Power users live in keyboard shortcuts. Search-first UX scales as the catalog grows — you don't want to scroll 500 products to find one.

---

## 15. Export (CSV / Excel)

### What it does
Every list page has an Export button → choose Excel (.xlsx) or CSV → file downloads.

### How it works
- `apps/web/src/lib/utils/export.ts`
  - `downloadCSV(rows, filename)` — manually constructs CSV with proper escaping + UTF-8 BOM
  - `downloadXLSX(rows, filename, sheetName)` — uses `xlsx` library, auto-sizes columns
- `apps/web/src/components/shared/export-button.tsx`
  - Dropdown component with two options
  - Spinner during export, toast on success/error

### Why
Tax season. Audits. Sharing with accountants. CSV is universal, XLSX preserves formatting. UTF-8 BOM is critical — without it, Excel renders Indian characters (₹, etc.) as gibberish.

---

## 16. Theme & UI

### Dark-first design
Default dark theme with light mode toggle. Amber/gold accent (`#f59e0b`) — fitting for liquor branding.

### Color system
- Built on OKLCH color space (Tailwind v4 standard) — perceptually uniform, better gradients
- Charts use direct hex colors (not CSS variables) because SVG can't parse `hsl(oklch(...))`

### Animations
- Framer Motion v11 throughout
- Page entrance — staggered card reveals with `delay: i * 0.05`
- Sidebar collapse — spring physics (`stiffness: 260, damping: 20`)
- Active nav indicator uses `layoutId` for shared element transition
- KPI numbers animate count-up on mount via `requestAnimationFrame` + cubic ease-out
- Dialog/Sheet open with scale + fade

### Components
- 22 shadcn primitives installed (Button, Card, Dialog, Sheet, Table, Tabs, etc.)
- All in `apps/web/src/components/ui/` — fully customizable, no external dependency

---

## 17. Mobile Responsiveness

### How it works
- Sidebar hidden on `< md` (`hidden md:flex`), replaced by Sheet drawer
- Header gets hamburger menu icon on mobile
- All grids stack: `grid-cols-2 md:grid-cols-4` etc.
- All tables wrapped in `overflow-x-auto` for horizontal scroll
- Filter toolbars use `flex-wrap`
- Page headers stack on small screens: `flex-col sm:flex-row`
- Padding reduced: `p-4 md:p-6`

### Breakpoints
- `sm`: 640px (small phones landscape, large phones)
- `md`: 768px (tablets, sidebar appears)
- `lg`: 1024px (desktop layouts)
- `xl`: 1280px (wide screens — KPI cards become 6-column)

### Why
Owners check stock from their phone. Staff scan barcodes from a tablet. The same UI works everywhere.

---

## 18. Cross-Cutting Concerns

### Security
- Helmet middleware (security headers)
- Compression (gzip)
- Rate limiting (100 req/min via `ThrottlerGuard`)
- HttpOnly cookies (XSS-safe JWT)
- bcrypt for password hashing (cost 12)
- DTO validation everywhere via `class-validator`

### Performance
- Server Components by default (Next.js 15)
- `Promise.all()` for parallel DB queries in services
- Prisma connection pooling
- TanStack Query caching (30s stale time)
- Skeleton loaders on data fetches
- Image lazy loading via Next.js `<Image>`

### Type Safety
- Prisma generates types from schema
- Zod schemas validate forms with inferred types
- `class-validator` validates API inputs
- Shared `packages/shared/src/types` for cross-app interfaces

### Observability
- NestJS Logger throughout (`@nestjs/common`)
- Global exception filter logs all errors with stack traces
- Audit log captures every mutation

### Developer Experience
- Hot reload on both frontend (Next.js) and backend (NestJS watch)
- Turborepo parallel dev, cached builds
- Swagger auto-generated from controllers
- Prisma Studio for visual DB editing
- pnpm workspaces avoid duplicate installs

---

## 19. Complete File Index

### Root
- `README.md` — Setup, run instructions, features overview
- `FUNCTIONALITY.md` — This file
- `PLAN.md` — Original market research + roadmap
- `CLAUDE.md` — Context file for AI assistants
- `package.json` — Workspace root scripts
- `pnpm-workspace.yaml` — Workspace definition
- `turbo.json` — Turborepo pipeline
- `docker-compose.yml` — PostgreSQL container (port 5433)
- `.env` / `.env.example` — Environment variables
- `.gitignore`

### Frontend (`apps/web/`)
**Config:**
- `package.json`, `tsconfig.json`, `next.config.ts`
- `tailwind.config.ts` (v4 stub), `postcss.config.mjs`
- `components.json` (shadcn config)
- `FRONTEND_PLAN.md`

**App routes (`src/app/`):**
- `layout.tsx` — root layout with providers
- `globals.css` — Tailwind v4 + theme tokens
- `(auth)/login/page.tsx` — login with demo credentials
- `(auth)/register/page.tsx` — user registration
- `(dashboard)/layout.tsx` — sidebar shell
- `(dashboard)/page.tsx` — dashboard home
- `(dashboard)/products/page.tsx` — product list
- `(dashboard)/products/new/page.tsx` — create product with variants
- `(dashboard)/products/[id]/page.tsx` — product detail
- `(dashboard)/inventory/page.tsx` — stock ledger + adjustments
- `(dashboard)/purchase-orders/page.tsx` — PO list with status tabs
- `(dashboard)/purchase-orders/new/page.tsx` — create PO form
- `(dashboard)/purchase-orders/[id]/page.tsx` — PO detail + receive goods
- `(dashboard)/suppliers/page.tsx` — supplier list
- `(dashboard)/suppliers/new/page.tsx` — create supplier
- `(dashboard)/suppliers/[id]/page.tsx` — supplier detail with PO history
- `(dashboard)/sales/page.tsx` — POS-lite + sale history
- `(dashboard)/reports/page.tsx` — tabbed analytics
- `(dashboard)/alerts/page.tsx` — low stock alerts
- `(dashboard)/settings/users/page.tsx` — user management
- `(dashboard)/settings/categories/page.tsx` — category CRUD
- `middleware.ts` — JWT cookie auth check on routes

**Components (`src/components/`):**
- `ui/*` — 22 shadcn primitives (button, card, dialog, etc.)
- `layout/dashboard-shell.tsx` — desktop + mobile shell wrapper
- `layout/sidebar.tsx` — collapsible sidebar with mobile Sheet
- `layout/header.tsx` — sticky header with search + theme + user menu
- `modules/dashboard/dashboard-page.tsx` — dashboard composition
- `modules/dashboard/kpi-card.tsx` — animated KPI cards
- `modules/dashboard/stock-chart.tsx` — area chart
- `modules/dashboard/sales-chart.tsx` — donut chart
- `modules/dashboard/top-products.tsx` — bar chart
- `modules/dashboard/low-stock-panel.tsx` — alert panel
- `modules/dashboard/recent-activity.tsx` — timeline feed
- `shared/theme-provider.tsx` — next-themes wrapper
- `shared/query-provider.tsx` — TanStack Query client
- `shared/global-search.tsx` — ⌘K command palette
- `shared/export-button.tsx` — CSV/Excel export dropdown

**Lib (`src/lib/`):**
- `api/index.ts` — axios client with 401 interceptor
- `utils.ts` — shadcn `cn()` helper
- `utils/cn.ts` — class merger (duplicate, kept for path stability)
- `utils/format.ts` — currency, number, date formatters
- `utils/export.ts` — CSV + XLSX download utilities
- `hooks/use-products.ts` — Products queries + mutations
- `hooks/use-suppliers.ts` — Supplier hooks
- `hooks/use-purchase-orders.ts` — PO hooks + receive goods
- `hooks/use-inventory.ts` — Stock movements + adjust hook
- `hooks/use-sales.ts` — Sales + void hook
- `hooks/use-reports.ts` — Analytics hooks
- `hooks/use-alerts.ts` — Alert hook with auto-refetch
- `hooks/use-users.ts` — User management hooks
- `validations/product.ts` — Zod schema for products
- `validations/supplier.ts` — Zod schema for suppliers
- `validations/purchase-order.ts` — Zod schema for POs

**Types:**
- `types/index.ts` — TypeScript interfaces for all entities

### Backend (`apps/api/`)
**Config:**
- `package.json`, `tsconfig.json`
- `.env` (local), `BACKEND_PLAN.md`

**Prisma (`prisma/`):**
- `schema.prisma` — 12 models, 5 enums (Role, UnitType, MovementType, POStatus, PaymentType)
- `seed.ts` — admin + categories + sample product
- `migrations/20260630161659_init/` — initial migration

**Bootstrap (`src/`):**
- `main.ts` — NestJS bootstrap with Swagger, helmet, compression, CORS
- `app.module.ts` — root module imports

**Common (`src/common/`):**
- `prisma/prisma.module.ts` — Global Prisma module
- `prisma/prisma.service.ts` — PrismaClient with lifecycle hooks
- `guards/jwt-auth.guard.ts`
- `guards/roles.guard.ts`
- `decorators/current-user.decorator.ts` — `@CurrentUser('id')`
- `decorators/roles.decorator.ts` — `@Roles(Role.ADMIN)`
- `filters/http-exception.filter.ts` — global exception handler

**Modules (`src/modules/`):**

| Module | Files | Routes |
|---|---|---|
| `auth/` | controller, service, module, strategies/jwt, strategies/local, guards/local, dto/login | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| `users/` | controller, service, module, dto/create-user | `GET /users`, `POST /users`, `PATCH /users/:id` |
| `products/` | controller, service, module, dto/create-product, dto/update-product, dto/product-query | `GET /products`, `POST /products`, `GET /products/:id`, `PATCH /products/:id`, `DELETE /products/:id`, `GET /products/low-stock` |
| `inventory/` | controller, service, module, dto/stock-adjustment, dto/stock-movement-query | `GET /inventory/movements`, `GET /inventory/summary`, `POST /inventory/adjust` |
| `suppliers/` | controller, service, module, dto/create-supplier, dto/update-supplier | `GET /suppliers`, `POST /suppliers`, `GET /suppliers/:id`, `PATCH /suppliers/:id`, `DELETE /suppliers/:id` |
| `purchase-orders/` | controller, service, module, dto/create-purchase-order, dto/receive-goods | `GET /purchase-orders`, `POST /purchase-orders`, `GET /purchase-orders/:id`, `POST /purchase-orders/:id/receive`, `POST /purchase-orders/:id/cancel` |
| `sales/` | controller, service, module, dto/create-sale | `GET /sales`, `POST /sales`, `POST /sales/:id/void`, `GET /sales/daily-summary` |
| `reports/` | controller, service, module | `GET /reports/inventory-valuation`, `GET /reports/low-stock`, `GET /reports/dead-stock`, `GET /reports/sales-summary`, `GET /reports/stock-movements` |
| `alerts/` | controller, service, module | `GET /alerts/low-stock` |
| `audit/` | controller, service, module | `GET /audit` |
| `categories/` | controller, service, module | `GET /categories`, `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id` |

### Shared (`packages/shared/`)
- `package.json`
- `src/index.ts` — barrel
- `src/types/index.ts` — cross-app interfaces
- `src/constants/index.ts` — labels, enums

### Total: 140+ TypeScript files (excluding node_modules)

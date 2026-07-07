# LiquorERP — Full Market Research & Implementation Plan

> Minimal, modern ERP-type inventory system for a liquor shop.
> Stack: Next.js 15 · NestJS · PostgreSQL · Prisma · Tailwind · Shadcn UI · 21st.dev · Framer Motion

---

## 1. Market Research

### 1.1 Competitive Landscape

| Product | Type | Strengths | Weaknesses |
|---|---|---|---|
| **BottlePOS** | Purpose-built liquor POS/ERP | Deep compliance, bottle deposit, dual pricing | Expensive, heavy |
| **WinePOS** | Liquor-specific POS | Checkout + inventory + eCommerce unified | Limited analytics |
| **mPower Beverage** | Beverage retail specialist | Industry-specific workflows, distributor integration | Dated UI |
| **WISK / AccuBar** | Bar inventory tools | AI variance detection, mobile scanning | Bar-focused, not retail |
| **Craftable** | F&B inventory | Pour cost analysis, vendor invoice processing | Restaurant-first |
| **LS Central** | Enterprise ERP (Microsoft D365) | Full compliance, lot tracking, multi-location | Very expensive, complex |
| **Square for Retail** | Generic retail POS | Easy setup, low cost | No liquor-specific compliance |
| **Lightspeed / KORONA** | Mid-market retail | Good inventory depth | No liquor compliance |
| **Odoo / NetSuite** | Full ERP | Modular, scalable | Requires heavy customization |

### 1.2 Market Size & Trends
- Global alcohol eCommerce projected to reach **$36 billion by 2028**
- Liquor store net profit margins: **2–5%** — extremely thin, so inventory precision directly impacts viability
- Industry shrinkage rate: **2–4% of revenue** (employee theft, breakage, admin errors)
- Major 2026 trend: **AI-powered replenishment**, real-time compliance automation, mobile-first counting

### 1.3 Core Pain Points (What We Are Solving)

| Pain Point | Impact | Our Solution |
|---|---|---|
| Managing case/pack/single units of same product | High manual error rate | Multi-unit product variants with auto-conversion |
| Shrinkage & employee theft | 2-4% revenue loss | Audit logs, role permissions, variance tracking |
| Stock-outs of fast movers | Lost sales | Reorder point alerts + automated PO drafts |
| Overstocking slow movers | Tied-up capital | Velocity analytics + dead-stock reports |
| Tax & compliance complexity | Regulatory risk | Built-in tax mapping + audit-ready logs |
| Vendor management chaos | Operational inefficiency | Centralized vendor + PO management |
| No real-time visibility | Reactive, not proactive | Live dashboard with KPI cards + charts |

### 1.4 Feature Benchmarking (Must-Haves vs. Nice-to-Haves)

**Must Have (MVP)**
- Real-time inventory tracking (case / pack / single breakdown)
- Product catalog with categories, brands, SKUs, barcodes
- Supplier / vendor management
- Purchase order creation & goods receiving
- Low-stock alerts with reorder points
- Sales entry / POS-lite (manual sale logging)
- Role-based access (Admin, Manager, Staff)
- Audit trail on all stock movements
- Basic reports: inventory value, stock movement, low stock

**Phase 2 (Post-MVP)**
- Age verification log
- Barcode scanner integration (USB/mobile)
- Automated PO drafts based on reorder triggers
- Profit margin & pour-cost analytics
- Multi-location / warehouse support
- Export to CSV / PDF (for tax filing)
- Supplier performance tracking

**Phase 3 (Future)**
- AI-powered demand forecasting
- Mobile app (React Native / Expo)
- eCommerce integration
- Loyalty & customer management

---

## 2. Tech Stack Decision

### 2.1 Full Stack

| Layer | Technology | Reason |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) | RSC + Server Actions, SEO, streaming |
| **Backend API** | NestJS | Modular, decorators, DI, scales well |
| **Database** | PostgreSQL | ACID compliance, relational, production-proven |
| **ORM** | Prisma | Type-safe, migrations, excellent DX |
| **Auth** | NestJS + JWT + HttpOnly cookies | Secure, stateless |
| **UI Library** | Shadcn UI | Headless, fully customizable, Radix-based |
| **Components** | 21st.dev registry | Premium community components on top of shadcn |
| **Styling** | Tailwind CSS v4 | Utility-first, fast, consistent |
| **Animations** | Framer Motion v11 | Page transitions, micro-interactions, charts |
| **Charts** | Recharts + shadcn charts | Composable, works perfectly with shadcn |
| **State** | TanStack Query v5 | Server state, caching, optimistic updates |
| **Forms** | React Hook Form + Zod | Type-safe forms with schema validation |
| **Monorepo** | Turborepo | Shared packages, fast builds |
| **Containerization** | Docker + Docker Compose | Local dev consistency |
| **Package Manager** | pnpm | Fast, disk-efficient |

### 2.2 Project Structure (Monorepo)

```
/liquor-erp
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── app/
│   │   │   ├── (auth)/         # login, register
│   │   │   ├── (dashboard)/    # protected routes
│   │   │   │   ├── page.tsx            # Main dashboard
│   │   │   │   ├── inventory/          # Inventory module
│   │   │   │   ├── products/           # Product catalog
│   │   │   │   ├── purchase-orders/    # PO management
│   │   │   │   ├── suppliers/          # Vendor management
│   │   │   │   ├── sales/              # Sales / POS-lite
│   │   │   │   ├── reports/            # Analytics & reports
│   │   │   │   ├── alerts/             # Low stock alerts
│   │   │   │   └── settings/           # Users, roles, config
│   │   ├── components/
│   │   │   ├── ui/             # shadcn + 21st.dev components
│   │   │   ├── layout/         # Sidebar, header, nav
│   │   │   └── modules/        # Feature-specific components
│   │   └── lib/                # API client, utils, hooks
│   │
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── auth/           # JWT auth module
│       │   ├── users/          # User management
│       │   ├── products/       # Product catalog
│       │   ├── inventory/      # Stock movements
│       │   ├── suppliers/      # Vendor management
│       │   ├── purchase-orders/ # PO workflows
│       │   ├── sales/          # Sales records
│       │   ├── reports/        # Analytics queries
│       │   ├── alerts/         # Alert engine
│       │   └── audit/          # Audit log module
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
└── packages/
    ├── shared/                 # Shared TypeScript types & interfaces
    └── ui/                     # Shared UI component stubs (optional)
```

---

## 3. Database Schema

### Core Entities

```prisma
// Users & Auth
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  passwordHash  String
  role          Role      @default(STAFF)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  auditLogs     AuditLog[]
  createdPOs    PurchaseOrder[]
}

enum Role { ADMIN MANAGER STAFF }

// Product Catalog
model Category {
  id        String    @id @default(cuid())
  name      String    @unique   // Whiskey, Vodka, Beer, Wine, Rum, Gin, etc.
  products  Product[]
}

model Supplier {
  id              String    @id @default(cuid())
  name            String
  contactPerson   String?
  email           String?
  phone           String?
  address         String?
  avgLeadDays     Int       @default(3)
  notes           String?
  isActive        Boolean   @default(true)
  products        Product[]
  purchaseOrders  PurchaseOrder[]
  createdAt       DateTime  @default(now())
}

model Product {
  id            String    @id @default(cuid())
  name          String
  brand         String
  sku           String    @unique
  barcode       String?
  categoryId    String
  category      Category  @relation(fields: [categoryId], references: [id])
  supplierId    String?
  supplier      Supplier? @relation(fields: [supplierId], references: [id])
  description   String?
  imageUrl      String?
  isActive      Boolean   @default(true)
  variants      ProductVariant[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model ProductVariant {
  id              String    @id @default(cuid())
  productId       String
  product         Product   @relation(fields: [productId], references: [id])
  unit            UnitType              // CASE, PACK, BOTTLE, CAN
  unitsPerParent  Int?                  // e.g. 12 bottles per case
  size            String?               // "750ml", "1L", "375ml"
  barcode         String?
  costPrice       Decimal   @db.Decimal(10,2)
  sellingPrice    Decimal   @db.Decimal(10,2)
  reorderPoint    Int       @default(10)
  currentStock    Int       @default(0)
  stockMovements  StockMovement[]
  purchaseOrderItems PurchaseOrderItem[]
  saleItems       SaleItem[]
}

enum UnitType { CASE PACK BOTTLE CAN KEG }

// Inventory & Stock Movements
model StockMovement {
  id              String      @id @default(cuid())
  variantId       String
  variant         ProductVariant @relation(fields: [variantId], references: [id])
  type            MovementType
  quantity        Int                   // positive = in, negative = out
  reason          String?
  referenceId     String?               // PO id, Sale id, etc.
  referenceType   String?               // "PURCHASE_ORDER", "SALE", "ADJUSTMENT"
  createdById     String
  createdAt       DateTime    @default(now())
}

enum MovementType { PURCHASE SALE ADJUSTMENT WASTAGE RETURN TRANSFER }

// Purchase Orders
model PurchaseOrder {
  id            String    @id @default(cuid())
  poNumber      String    @unique
  supplierId    String
  supplier      Supplier  @relation(fields: [supplierId], references: [id])
  status        POStatus  @default(DRAFT)
  expectedDate  DateTime?
  receivedDate  DateTime?
  notes         String?
  createdById   String
  createdBy     User      @relation(fields: [createdById], references: [id])
  items         PurchaseOrderItem[]
  totalAmount   Decimal   @db.Decimal(10,2) @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum POStatus { DRAFT SENT PARTIAL_RECEIVED RECEIVED CANCELLED }

model PurchaseOrderItem {
  id          String          @id @default(cuid())
  poId        String
  po          PurchaseOrder   @relation(fields: [poId], references: [id])
  variantId   String
  variant     ProductVariant  @relation(fields: [variantId], references: [id])
  orderedQty  Int
  receivedQty Int             @default(0)
  unitCost    Decimal         @db.Decimal(10,2)
}

// Sales (POS-lite)
model Sale {
  id          String    @id @default(cuid())
  saleNumber  String    @unique
  items       SaleItem[]
  totalAmount Decimal   @db.Decimal(10,2)
  paymentType PaymentType @default(CASH)
  createdById String
  createdAt   DateTime  @default(now())
}

enum PaymentType { CASH CARD UPI }

model SaleItem {
  id          String          @id @default(cuid())
  saleId      String
  sale        Sale            @relation(fields: [saleId], references: [id])
  variantId   String
  variant     ProductVariant  @relation(fields: [variantId], references: [id])
  quantity    Int
  unitPrice   Decimal         @db.Decimal(10,2)
  totalPrice  Decimal         @db.Decimal(10,2)
}

// Audit Log
model AuditLog {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  action      String
  entity      String
  entityId    String
  oldValue    Json?
  newValue    Json?
  createdAt   DateTime  @default(now())
}
```

---

## 4. Application Modules & Pages

### Module 1 — Dashboard (Home)
- **KPI Cards**: Total SKUs, Total Stock Value, Low Stock Count, Today's Sales
- **Charts**: Stock movement over 30 days (line), Sales by category (donut), Top 10 movers (bar)
- **Alerts Panel**: Live low-stock warnings, pending POs
- **Recent Activity**: Last 10 stock movements with user attribution
- **Animations**: Staggered card entrance (Framer Motion), animated number counters

### Module 2 — Product Catalog
- Product list with search, filter by category/brand/supplier
- Product detail page with all variants (case/pack/bottle)
- Create/Edit product form with image upload
- Barcode display per variant
- Quick stock adjustment inline

### Module 3 — Inventory
- Full stock ledger — all movements with filters
- Manual stock adjustment form (with mandatory reason)
- Stock count / physical audit form
- Variance report (expected vs. actual)
- Category-level stock summary

### Module 4 — Suppliers
- Supplier list with search
- Create/Edit supplier with contact info
- Supplier detail — linked products, PO history, performance metrics
- Lead time tracking

### Module 5 — Purchase Orders
- PO list (Draft / Sent / Received / Cancelled) with Kanban-style tabs
- Create PO — pick supplier, add line items, set expected date
- PO detail page — receive goods (partial or full), auto-updates stock
- PO PDF export (Phase 2)

### Module 6 — Sales (POS-Lite)
- Quick sale entry: scan/search product → quantity → payment type
- Sale history with date/user filters
- Daily sales summary
- Void/return a sale (with stock reversal)

### Module 7 — Reports & Analytics
- Inventory Valuation Report (stock × cost)
- Stock Movement Report (by date range, category, product)
- Low Stock Report (items below reorder point)
- Sales Report (by day/week/month, by product, by category)
- Dead Stock Report (no movement in 30/60/90 days)
- Profit Margin Report (selling price − cost)

### Module 8 — Alerts
- Configured alert rules per product variant (reorder point)
- Notification center (in-app bell)
- Alert history log

### Module 9 — Settings
- **Users**: List, invite, edit roles, deactivate
- **Categories**: Manage product categories
- **Store Config**: Store name, currency, tax rate
- **Audit Log viewer**: Full searchable audit trail

---

## 5. UI / UX Design System

### Visual Direction
- **Theme**: Dark-first with light mode toggle (zinc/slate palette)
- **Primary accent**: Amber/Gold (`#F59E0B`) — fitting for liquor brand identity
- **Sidebar**: Collapsible left nav (Framer Motion slide)
- **Typography**: Inter (body) + Geist (monospace for SKUs/numbers)
- **Border radius**: Tight (4–6px) for a professional/dense data feel

### Shadcn UI Components Used
- `DataTable` (with sorting, filtering, pagination)
- `Dialog` / `Sheet` (for create/edit forms)
- `Command` (product search / quick actions)
- `Calendar` + `DateRangePicker` (report filters)
- `Badge`, `Alert`, `Progress`
- `Tabs`, `Card`, `Separator`
- `Form`, `Input`, `Select`, `Textarea`
- `DropdownMenu`, `ContextMenu`
- `Skeleton` (loading states)
- `Toaster` (success/error feedback)

### 21st.dev Components
- Animated stat cards with sparklines
- Gradient KPI tiles
- Number ticker (animated counters on dashboard)
- Timeline component (for audit log)
- Stepper (for PO receive workflow)

### Framer Motion Usage
- Page transition: `AnimatePresence` + slide-fade on route changes
- Dashboard cards: staggered entrance animation
- Sidebar: smooth collapse/expand
- Table rows: fade-in on data load
- Dialogs: spring-based open/close
- Alert badges: pulse animation on new alerts
- Number counters: animated count-up

### Charts (Recharts + shadcn charts)
- **Line chart**: Stock movement over time
- **Bar chart**: Top products by sales volume
- **Donut chart**: Sales breakdown by category
- **Area chart**: Inventory value trend
- **Heatmap**: Sales by day of week × hour

---

## 6. API Design (NestJS)

### Auth
```
POST   /auth/login
POST   /auth/logout
GET    /auth/me
POST   /auth/refresh
```

### Products
```
GET    /products               (list, filter, paginate)
POST   /products               (create)
GET    /products/:id           (detail with variants)
PATCH  /products/:id           (update)
DELETE /products/:id           (soft delete)
GET    /products/:id/variants  (list variants)
POST   /products/:id/variants  (add variant)
PATCH  /variants/:id           (update variant)
```

### Inventory
```
GET    /stock-movements        (list, filter by date/product/type)
POST   /stock-movements        (manual adjustment)
GET    /stock/summary          (current stock levels, all variants)
GET    /stock/low              (items below reorder point)
GET    /stock/valuation        (stock × cost report)
```

### Suppliers
```
GET    /suppliers
POST   /suppliers
GET    /suppliers/:id
PATCH  /suppliers/:id
```

### Purchase Orders
```
GET    /purchase-orders
POST   /purchase-orders
GET    /purchase-orders/:id
PATCH  /purchase-orders/:id    (update status, notes)
POST   /purchase-orders/:id/receive  (receive goods, creates stock movement)
```

### Sales
```
GET    /sales
POST   /sales                  (create sale, auto-decrements stock)
GET    /sales/:id
POST   /sales/:id/void         (void sale, reverses stock)
```

### Reports
```
GET    /reports/inventory-value
GET    /reports/stock-movement
GET    /reports/low-stock
GET    /reports/sales-summary
GET    /reports/dead-stock
GET    /reports/profit-margin
```

### Users & Audit
```
GET    /users
POST   /users/invite
PATCH  /users/:id
GET    /audit-log
```

---

## 7. Development Phases & Timeline

### Phase 0 — Setup (Day 1–2)
- [ ] Init Turborepo monorepo with pnpm
- [ ] Scaffold Next.js 15 app (App Router, TypeScript, Tailwind v4)
- [ ] Scaffold NestJS app (TypeScript, Prisma, PostgreSQL)
- [ ] Docker Compose for PostgreSQL local dev
- [ ] Configure Shadcn UI in Next.js
- [ ] Set up ESLint, Prettier, path aliases
- [ ] Create shared `packages/shared` for types

### Phase 1 — Foundation (Day 3–6)
- [ ] Prisma schema & migrations (all models)
- [ ] NestJS auth module (JWT, bcrypt, guards)
- [ ] Login page with Framer Motion entrance
- [ ] Protected route middleware (Next.js middleware.ts)
- [ ] Sidebar layout with collapsible nav + dark mode toggle
- [ ] Dashboard shell with skeleton loading states
- [ ] Global TanStack Query client setup

### Phase 2 — Core Inventory (Day 7–12)
- [ ] Product catalog CRUD (list, create, edit, delete)
- [ ] Product variants management (case/pack/bottle)
- [ ] Category management
- [ ] Stock movements ledger
- [ ] Manual stock adjustment with audit trail
- [ ] Low stock alert engine (cron job in NestJS)
- [ ] Supplier CRUD

### Phase 3 — PO & Sales (Day 13–18)
- [ ] Purchase Order creation flow (multi-step with stepper)
- [ ] PO goods receiving workflow (partial/full)
- [ ] Auto stock increment on PO receive
- [ ] POS-lite sales entry form
- [ ] Sale void with stock reversal
- [ ] Auto stock decrement on sale

### Phase 4 — Dashboard & Reports (Day 19–24)
- [ ] Dashboard KPI cards with animated number counters
- [ ] Stock movement line chart (30-day)
- [ ] Sales by category donut chart
- [ ] Top products bar chart
- [ ] Reports pages (inventory value, low stock, sales, dead stock)
- [ ] Date range picker on all reports

### Phase 5 — Polish & UX (Day 25–28)
- [ ] Page transitions (Framer Motion AnimatePresence)
- [ ] Staggered card animations on dashboard
- [ ] Toast notifications for all actions
- [ ] Empty states with illustrations
- [ ] Mobile responsive sidebar (drawer on mobile)
- [ ] Loading skeletons on all data tables
- [ ] Error boundaries

### Phase 6 — Auth & Settings (Day 29–30)
- [ ] User management (invite, role change, deactivate)
- [ ] Audit log viewer (searchable, filterable)
- [ ] Store settings page
- [ ] User profile page

---

## 8. Key Technical Decisions

| Decision | Choice | Why |
|---|---|---|
| Monorepo vs. separate repos | **Turborepo monorepo** | Share types between frontend/backend with zero duplication |
| REST vs. GraphQL | **REST** | Simpler for this scope, NestJS supports it perfectly |
| Prisma vs. TypeORM | **Prisma** | Better DX, type safety, migration tooling in 2026 |
| Client state | **TanStack Query** | Server state management + caching + optimistic updates |
| Form lib | **React Hook Form + Zod** | Type-safe forms, Zod schemas reused in backend DTOs |
| Auth strategy | **JWT + HttpOnly Cookie** | Secure against XSS, stateless for API |
| Charts | **Recharts (via shadcn charts)** | Already integrated with shadcn, composable |
| Deployment target | **Docker** for local, **Railway/Render** for prod | Simple, cost-effective for a single shop |

---

## 9. Folder Conventions

```
# Component naming
PascalCase for components: ProductTable.tsx, StockMovementForm.tsx

# File naming
kebab-case for everything else: use-stock-alerts.ts, stock-movement.service.ts

# API response shape
{ data: T, meta?: { total, page, limit } }

# Error shape
{ message: string, statusCode: number, errors?: Record<string, string[]> }
```

---

## 10. What Makes This Different from Off-the-Shelf Solutions

1. **Tailored for a single shop** — no bloat, no features you'll never use
2. **Modern UI** — dark mode, animated, responsive — not the 2010-era ERP UIs
3. **Case/Pack/Bottle tracking built-in** — the #1 pain point for liquor retail
4. **Audit trail by default** — every stock movement is logged with user + reason
5. **Owned & self-hosted** — no per-user SaaS fees, data stays with you
6. **Extensible** — clean module architecture means adding new features is straightforward

---

## 11. Tech Stack Install Commands (Reference)

```bash
# Monorepo
pnpm create turbo@latest liquor-erp

# Next.js (web app)
pnpm create next-app@latest apps/web --typescript --tailwind --app --src-dir

# Shadcn UI
pnpm dlx shadcn@latest init

# NestJS (api app)
pnpm add -g @nestjs/cli
nest new apps/api

# Key dependencies (web)
pnpm add framer-motion @tanstack/react-query react-hook-form zod recharts

# Key dependencies (api)
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs
pnpm add prisma @prisma/client
pnpm add class-validator class-transformer
```

---

*Research Sources: BottlePOS, WinePOS, mPower Beverage, WISK, LS Central, Craftable, Shopventory, HandiFox, WinePOS blog, Nordync blog, Prisma docs, shadcn/ui docs, 21st.dev, AdminLTE blog, UXPin dashboard guide.*

# Frontend Plan — LiquorERP Web App

## Stack
- **Next.js 15** (App Router, RSC, Server Actions)
- **Tailwind CSS v4** + **Shadcn UI** + **21st.dev** components
- **Framer Motion v11** — page transitions, micro-animations
- **TanStack Query v5** — server state, caching, optimistic updates
- **React Hook Form + Zod** — type-safe forms
- **Recharts** (via shadcn charts) — data visualization
- **Sonner** — toast notifications
- **next-themes** — dark/light mode

## Design System
| Token | Value |
|---|---|
| Primary accent | Amber `#F59E0B` |
| Background (dark) | Zinc-950 `hsl(240 10% 3.9%)` |
| Card (dark) | Zinc-900 `hsl(240 10% 5.5%)` |
| Border | Zinc-800 |
| Font | Inter (body) + Geist Mono (numbers/SKUs) |
| Radius | 6px (tight, professional) |

## Folder Structure
```
src/
├── app/
│   ├── (auth)/login/          ← Login page (public)
│   ├── (auth)/register/       ← Register page (public)
│   └── (dashboard)/           ← Protected layout with sidebar
│       ├── page.tsx           ← Dashboard home
│       ├── inventory/         ← Stock ledger, adjustments
│       ├── products/          ← Catalog, variants
│       ├── purchase-orders/   ← PO list, create, receive
│       ├── suppliers/         ← Vendor management
│       ├── sales/             ← POS-lite, history
│       ├── reports/           ← Analytics + reports
│       ├── alerts/            ← Low stock alerts
│       └── settings/          ← Users, categories
├── components/
│   ├── ui/                    ← shadcn primitives
│   ├── layout/                ← Sidebar, Header
│   ├── modules/               ← Feature-specific components
│   │   ├── dashboard/         ← KPI cards, charts
│   │   ├── inventory/         ← Movement table, adjustment form
│   │   ├── products/          ← Product table, variant forms
│   │   ├── purchase-orders/   ← PO form, receive modal
│   │   ├── suppliers/         ← Supplier list/form
│   │   ├── sales/             ← POS form, sale history
│   │   └── reports/           ← Chart pages
│   └── shared/                ← ThemeProvider, QueryProvider, etc.
├── lib/
│   ├── api/                   ← axios client + endpoint functions
│   ├── hooks/                 ← Custom TanStack Query hooks
│   ├── utils/                 ← cn(), format, dates
│   └── validations/           ← Zod schemas (shared with forms)
├── store/                     ← Zustand (UI state: sidebar collapsed, etc.)
└── types/                     ← Re-exports from @liquor-erp/shared
```

## Pages & Components Plan

### Dashboard
- `KpiCard` — animated number counter, sparkline, change indicator
- `StockMovementChart` — 30-day line chart (Recharts)
- `SalesByCategoryChart` — donut chart
- `TopProductsChart` — horizontal bar chart
- `LowStockAlertPanel` — list with amber badges
- `RecentActivityFeed` — timeline of last 10 movements

### Products
- `ProductTable` — shadcn DataTable with sorting/filtering
- `ProductSheet` — slide-over form (create/edit)
- `VariantForm` — nested form for case/pack/bottle variants
- `ProductDetail` — full page with variant list + stock chart

### Inventory
- `StockMovementTable` — paginated ledger
- `StockAdjustmentDialog` — modal with reason field
- `StockSummaryCard` — total value, low stock count

### Purchase Orders
- `POList` — tabs by status (Draft / Sent / Received / Cancelled)
- `POCreateForm` — multi-step: pick supplier → add items → review
- `POReceiveModal` — receive goods workflow with qty inputs
- `POStatusBadge` — colored badge per status

### Suppliers
- `SupplierTable` — list with product/PO counts
- `SupplierSheet` — create/edit form
- `SupplierDetail` — linked products + PO history

### Sales (POS-lite)
- `QuickSaleForm` — product search → qty → payment type → submit
- `SaleHistory` — table with void action
- `DailySummaryCard` — today's count + revenue

### Reports
- `InventoryValuationTable` — stock × cost per variant
- `LowStockReport` — below reorder point
- `DeadStockReport` — no movement in N days
- `SalesSummaryReport` — revenue, COGS, gross profit with chart
- `DateRangePicker` — shared filter component

## Animation Plan (Framer Motion)
| Interaction | Animation |
|---|---|
| Page transition | `AnimatePresence` slide-fade (150ms) |
| Dashboard cards | Staggered entrance (50ms delay each) |
| KPI numbers | Count-up on mount |
| Sidebar collapse | Spring width (240→64px) |
| Dialogs/Sheets | Spring scale + fade |
| Table rows | Fade-in on data load |
| Low stock badge | Pulse ring on new alerts |

## Libraries Used
| Library | Purpose |
|---|---|
| `framer-motion` | All animations |
| `@tanstack/react-query` | Server state, caching |
| `react-hook-form` | Forms |
| `zod` | Schema validation |
| `recharts` | Charts |
| `sonner` | Toasts |
| `next-themes` | Dark/light mode |
| `date-fns` | Date formatting |
| `lucide-react` | Icons |
| `clsx + tailwind-merge` | Class merging |
| `shadcn/ui` | UI primitives |
| `21st.dev` | Premium community components |

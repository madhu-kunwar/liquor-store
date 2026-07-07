# Filter & Sort System — Implementation Plan

## Current State & Root Causes

### Why columns aren't working

| Table | Mode | Problem |
|---|---|---|
| Products | Server-side | Computed columns (`totalStock`, `value`) can't sort via API. Category filter passes ID but `getValue` returns name — mismatch. Number filters never reach API. |
| Inventory | Server-side | Backend has a hardcoded `orderBy: { createdAt: "desc" }`. Frontend `apiQuery` strips `sortBy`/`sortOrder`/`search`. Nothing dynamic works. |
| Suppliers | Server-side | `cleanParams` in hook strips `filters`, so `isActive` column filter never reaches API. `products`/`purchaseOrders` count sort not in `SUPPLIER_SORT_FIELDS`. |
| Sales | Client-side | ✅ Works — DataTable handles everything in-browser |
| Purchase Orders | Client-side | ✅ Works — DataTable handles everything in-browser |
| Users | Client-side | ✅ Works — DataTable handles everything in-browser |

---

## The Fix: Mode Strategy

### Client-side tables (switch Products & Suppliers)

For a single liquor shop:
- Products: max ~200–500 items → fetch all with `limit: 1000`, sort/filter in browser
- Suppliers: max ~50–100 → fetch all with `limit: 500`, sort/filter in browser

**Benefit**: Every column — including computed ones like `totalStock`, `value`, counts — sorts and filters automatically with zero backend changes.

### Server-side tables (fix Inventory)

Inventory movements can grow into thousands of records. Keep server-side pagination but fix dynamic sort:
- Backend: add `sortBy`/`sortOrder` to the `StockMovementQueryDto` and `getStockMovements` service
- Frontend: fix `apiQuery` to pass `sortBy`, `sortOrder`, `search`

Number range filters (qty/balance) will work **within the current page** since the DataTable applies them client-side after the server returns data. This is acceptable — users can also filter by type server-side to narrow results first.

---

## Changes Required

### 1. `DataTable` — Already done ✅
- `filterType: "text" | "select" | "number"`
- `ColumnFilter` popover for all three types
- Client-side filter + sort logic handles all types
- `TableParams.filters` passed via `onParamsChange`

---

### 2. Products Page

**File**: `apps/web/src/app/(dashboard)/products/page.tsx`

| Change | Detail |
|---|---|
| Fetch mode | `useProducts({ limit: 1000 })` — no page/sort params needed |
| DataTable | Add `clientSide`, remove `total`, remove `onParamsChange` |
| Category filter | Change `filterOptions` values to category **name** (not ID). Change `getValue: r => r.category?.name` |
| isActive filter | `getValue: r => String(r.isActive)` matches `"true"`/`"false"` option values ✅ |
| Columns to add/fix | `totalStock` — `sortable`, `filterType: "number"` ✅ already added; `value` — same ✅ |
| Remove | `tableParams` state, `handleParams`, `apiQuery` memo, separate `categoryId`/`statusFilter` states |

---

### 3. Suppliers Page

**File**: `apps/web/src/app/(dashboard)/suppliers/page.tsx`

| Change | Detail |
|---|---|
| Fetch mode | `useSuppliers({ limit: 500 })` |
| DataTable | Add `clientSide`, remove `total`, remove `onParamsChange` |
| isActive filter | `getValue: r => String(r.isActive)` ✅ already added |
| Products/Orders count | `sortable: true`, `filterType: "number"` ✅ already added |
| Remove | `tableParams` state, `handleParams` |

---

### 4. Inventory Page

**File (backend)**: `apps/api/src/modules/inventory/dto/stock-movement-query.dto.ts`

Add:
```ts
@IsOptional() @IsString() sortBy?: string;   // "createdAt" | "type" | "quantity" | "balanceAfter"
@IsOptional() @IsString() sortOrder?: "asc" | "desc";
@IsOptional() @IsString() search?: string;
```

**File (backend)**: `apps/api/src/modules/inventory/inventory.service.ts`

Replace hardcoded `orderBy: { createdAt: "desc" }` with:
```ts
const MOVEMENT_SORT_FIELDS = new Set(["createdAt", "type", "quantity", "balanceAfter"]);

const orderBy = sortBy && MOVEMENT_SORT_FIELDS.has(sortBy)
  ? { [sortBy]: sortOrder as Prisma.SortOrder }
  : { createdAt: "desc" as const };
```

Add search via `variantId`-based product name lookup (optional — complex, skip for now).

**File (frontend)**: `apps/web/src/app/(dashboard)/inventory/page.tsx`

```ts
const apiQuery = useMemo(() => ({
  page: tableParams.page,
  limit: tableParams.limit,
  ...(tableParams.filters?.type && { type: tableParams.filters.type }),
  ...(tableParams.sortBy         && { sortBy: tableParams.sortBy, sortOrder: tableParams.sortOrder }),
}), [tableParams]);
```

---

### 5. Column `getValue` Audit

Every `sortable` column must have `getValue` returning a primitive. Missing ones:

| Table | Column | Fix |
|---|---|---|
| Inventory | `product` | `getValue: m => m.variant.product.name` |
| Inventory | `reason` | `getValue: m => m.reason ?? ""` |
| Purchase Orders | `expectedDate` | `getValue: p => p.expectedDate ?? ""` ✅ already added |
| Suppliers | `contact` | Not sortable — skip |

---

## Column Filter Summary (after fix)

| Table | Column | Filter Type | Works Via |
|---|---|---|---|
| Products | Product name | — | Global search |
| Products | Category | select (by name) | Client-side |
| Products | SKU | — | Global search |
| Products | Stock | number (min/max) | Client-side |
| Products | Value | number (min/max) | Client-side |
| Products | Status | select | Client-side |
| Inventory | Type | select | Server-side (API param) |
| Inventory | Qty | number (min/max) | Client-side (on current page) |
| Inventory | Balance | number (min/max) | Client-side (on current page) |
| Purchase Orders | Supplier | text | Client-side |
| Purchase Orders | Status | select | Client-side |
| Purchase Orders | Total | number (min/max) | Client-side |
| Suppliers | Status | select | Client-side |
| Suppliers | Products count | number (min/max) | Client-side |
| Suppliers | Orders count | number (min/max) | Client-side |
| Sales | Payment | select | Client-side |
| Sales | Cashier | text | Client-side |
| Sales | Total | number (min/max) | Client-side |
| Users | Role | select | Client-side |
| Users | Status | select | Client-side |

---

## Sort Summary (after fix)

| Table | Sortable Columns |
|---|---|
| Products | Name, SKU, Stock, Value, Status |
| Inventory | Type, Qty, Balance, Time |
| Purchase Orders | PO Number, Supplier, Status, Items, Total, Expected, Created |
| Suppliers | Name, Products count, Orders count, Lead Time, Status |
| Sales | Sale #, Total, Payment, Time |
| Users | Name, Role, Status, Joined |
| Categories | Name, Products count |

---

## Implementation Order

1. Fix `products/page.tsx` — switch to clientSide, fix category filter value
2. Fix `suppliers/page.tsx` — switch to clientSide
3. Fix inventory backend DTO + service — add dynamic sort
4. Fix `inventory/page.tsx` apiQuery — pass sort params
5. Add missing `getValue` to inventory columns

**Estimated changes**: ~6 files, ~80 lines changed.

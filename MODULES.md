# LiquorERP — Module Reference

> What every module does, what data it owns, and how all modules connect.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Data Model](#2-data-model)
3. [Module-by-Module Reference](#3-module-by-module-reference)
   - [Products](#31-products)
   - [Stock Register](#32-stock-register)
   - [Stock In](#33-stock-in)
   - [Sales](#34-sales)
   - [Current Stock (Inventory)](#35-current-stock-inventory)
   - [Dealer Orders](#36-dealer-orders)
   - [Purchase Orders](#37-purchase-orders)
   - [Suppliers](#38-suppliers)
   - [Customers](#39-customers)
   - [Reports / Analytics](#310-reports--analytics)
   - [Expenses](#311-expenses)
   - [Alerts](#312-alerts)
   - [Store Setup](#313-store-setup)
   - [Settings (Users & Categories)](#314-settings-users--categories)
4. [How Modules Synchronize](#4-how-modules-synchronize)
5. [Stock Movement Flow](#5-stock-movement-flow)
6. [Financial Flow](#6-financial-flow)
7. [Role Permissions](#7-role-permissions)
8. [Key Invariants](#8-key-invariants)

---

## 1. System Overview

LiquorERP is a monorepo ERP for a single liquor shop. It handles the full lifecycle:

```
Supplier → Purchase Order → Stock → Sale → Customer
                ↓
          Stock Register (audit trail)
                ↓
          Reports / Alerts
```

**Tech:** Next.js 15 (frontend, port 3000) + NestJS 10 (API, port 3005) + PostgreSQL (port 5433).

**Two sales channels exist side-by-side:**
- **Sales** — walk-in / retail / ad-hoc (cash, card, UPI, credit)
- **Dealer Orders** — wholesale / B2B, with staged dispatch and credit tracking

---

## 2. Data Model

### Core entities and their relationships

```
Category ──< Product ──< ProductVariant
                │               │
            Supplier        (all transactions)
                │
    ┌───────────┼───────────────────────┐
    │           │                       │
PurchaseOrder  StockMovement          Sale
    │           │                       │
PurchaseOrderItem  (created by every   SaleItem
                    stock event)        │
                                    Customer

DealerOrder ──< DealerOrderItem
    │
Customer

Expense         (standalone)
StoreSetting    (key-value config)
Notification    (system alerts)
AuditLog        (immutable trail)
User            (auth + creator tracking)
```

### All 14 DB models

| Model | Purpose | Key fields |
|---|---|---|
| `User` | Auth + creator reference | email, role (ADMIN/MANAGER/STAFF), isActive |
| `Category` | Product grouping | name, slug (unique), color |
| `Supplier` | Vendor master | name, phone, gstNumber, avgLeadDays, outstandingBalance |
| `Product` | Base product | name, brand, sku (unique), categoryId, supplierId |
| `ProductVariant` | Sellable unit | unit (BOTTLE/CASE/PACK/CAN/KEG), size, costPrice, sellingPrice, taxRate, exciseDuty, **currentStock**, reorderPoint, barcode |
| `StockMovement` | Every stock change | type (PURCHASE/SALE/ADJUSTMENT/WASTAGE/RETURN/TRANSFER), quantity, balanceAfter, referenceId |
| `PurchaseOrder` | Supplier orders | poNumber, status, totalAmount, paidAmount, paymentStatus |
| `PurchaseOrderItem` | Line items of PO | orderedQty, receivedQty, unitCost |
| `Sale` | Retail transaction | saleNumber, paymentType (CASH/CARD/UPI/CREDIT), totalAmount, discountAmount, isVoided |
| `SaleItem` | Line items of sale | quantity, unitPrice, costAtSale (snapshot at sale time) |
| `Customer` | Customer master | name, phone, creditBalance, creditLimit |
| `DealerOrder` | Wholesale order | orderNumber, status, paymentStatus, paidAmount |
| `DealerOrderItem` | Line items of dealer order | orderedQty, dispatchedQty, unitPrice |
| `Expense` | Operational cost | category, amount, date |
| `StoreSetting` | Store config | key (unique), value |
| `Notification` | System alerts | type, title, message, isRead |
| `AuditLog` | Change log | action, entity, oldValue (JSON), newValue (JSON) |

---

## 3. Module-by-Module Reference

---

### 3.1 Products

**Page:** `/products`, `/products/new`, `/products/[id]`  
**API:** `GET/POST/PATCH/DELETE /v1/products`, `PATCH /v1/products/variants/:id`

#### What it does
- Central catalog of every product sold in the shop.
- Each product has **multiple variants** (e.g., Whisky X → 750ml Bottle, 1L Bottle, Case of 12). This is the core feature that handles different pack sizes and pricing.
- Manages pricing (cost price, selling price), tax rates, excise duty, barcode, and reorder threshold per variant.

#### Data owned
- `Product` table: name, brand, SKU, category, supplier link, description
- `ProductVariant` table: unit, size, barcode, prices, tax rates, reorder point, **current stock level**

#### What it reads
- Categories (for the category dropdown)
- Suppliers (for the supplier dropdown)

#### What affects Products
- **Stock In / Purchase Orders** → update `currentStock` on variants
- **Sales / Dealer Orders** → decrease `currentStock` on variants
- **Manual Adjustments** → can increase or decrease `currentStock`
- **Inventory Adjust** → triggered on any `StockMovement`

#### Key logic
- SKU must be unique across all products
- Deleting a product is a **soft delete** (`isActive = false`) — data is preserved
- Barcode lookup (`GET /v1/products/barcode/:barcode`) enables fast POS entry
- Low-stock detection: `currentStock <= reorderPoint`

---

### 3.2 Stock Register

**Page:** `/stock-register`  
**API:** `GET /v1/inventory/ledger`, `GET /v1/inventory/movements`

#### What it does
- A **read-only audit ledger** showing every stock movement ever recorded.
- Shows total IN, total OUT, and current stock per variant.
- Lets you filter by product, movement type, date range.

#### Data owned
- Reads only — it queries `StockMovement` records.

#### What populates it
Every module that changes stock automatically creates a `StockMovement` entry:

| Action | Movement type written |
|---|---|
| Stock In | `PURCHASE` |
| Purchase Order receive | `PURCHASE` |
| Sale created | `SALE` |
| Sale voided | `RETURN` |
| Dealer Order dispatched | `SALE` |
| Dealer Order cancelled (after dispatch) | `RETURN` |
| Manual adjustment | `ADJUSTMENT` |
| Wastage entry | `WASTAGE` |

#### Key fields on each movement
`type`, `quantity`, `balanceAfter`, `reason`, `referenceId` (links back to the sale/PO/etc), `invoiceNumber`, `unitCost`, `supplierId`, `createdById`

---

### 3.3 Stock In

**Page:** `/stock-in`  
**API:** `POST /v1/inventory/stock-in`

#### What it does
- A **fast path** for receiving stock without creating a Purchase Order first.
- Use case: walk-in delivery, direct purchase, urgent top-up.
- Lets you select a product variant, enter quantity, cost, supplier (optional), invoice number (optional), and post it.

#### What it writes
1. Creates a `StockMovement` of type `PURCHASE`
2. Increments `ProductVariant.currentStock` by the entered quantity
3. Fires a `stock.low` event check after update (which may create a Notification if stock is still low)

#### Difference from Purchase Orders
| | Stock In | Purchase Order |
|---|---|---|
| Pre-approval step | No | Yes (DRAFT → SENT) |
| Tracks expected vs received | No | Yes (orderedQty vs receivedQty) |
| Multiple line items | No (one at a time) | Yes |
| Suitable for | Quick top-ups | Planned replenishment |

---

### 3.4 Sales

**Page:** `/sales`  
**API:** `GET/POST /v1/sales`, `POST /v1/sales/:id/void`, `GET /v1/sales/daily-summary`

#### What it does
- Records retail / walk-in sales.
- Supports multiple items per sale, discounts, multiple payment types.
- Tracks customer (optional) and links to supplier if applicable.
- Can void a sale (reverses stock).

#### Data owned
- `Sale`: total, discount, paymentType, customerId, createdById, isVoided
- `SaleItem`: variantId, quantity, unitPrice, discountAmount, **costAtSale** (snapshot of cost price at time of sale — used for margin reports)

#### What it writes (on create)
1. Creates `Sale` + `SaleItem` records
2. For each item: decrements `ProductVariant.currentStock`
3. For each item: creates a `StockMovement` (type `SALE`)
4. If `paymentType = CREDIT`: increments `Customer.creditBalance`

#### What it writes (on void)
1. Marks `Sale.isVoided = true`
2. For each item: increments `ProductVariant.currentStock` back
3. For each item: creates a `StockMovement` (type `RETURN`)
4. If credit sale: decrements `Customer.creditBalance`

#### Payment types
- `CASH` — immediate, no balance tracking
- `CARD` — immediate, no balance tracking
- `UPI` — immediate, no balance tracking
- `CREDIT` — increments customer's `creditBalance` (to be settled later)

#### Synchronizes with
- **Products** (reads variant price/cost)
- **Customers** (updates creditBalance for credit sales)
- **Stock Register** (every sale writes StockMovement)
- **Reports** (salesSummary, topSellers read SaleItem.costAtSale for margin)
- **Dashboard** (daily summary KPI)

---

### 3.5 Current Stock (Inventory)

**Page:** `/inventory`  
**API:** `GET /v1/inventory/summary`, `GET /v1/inventory/movements`, `POST /v1/inventory/adjust`

#### What it does
- Shows the **current state of stock** across all variants.
- Provides KPI cards: total products, total variants, total value, low stock count, out-of-stock count, today's purchases.
- Lets you make **manual adjustments** (add or remove stock with a reason).

#### Data owned
- Reads `ProductVariant.currentStock` for display
- Writes `StockMovement` on adjust + updates `currentStock`

#### Manual adjustment types
- `ADJUSTMENT` — routine correction (e.g., stocktake discrepancy)
- `WASTAGE` — breakage, spoilage
- `TRANSFER` — moved to another location

#### Triggers
A manual adjustment fires `stock.low` event → **Alerts** module picks it up and creates a Notification if stock falls below reorder point.

---

### 3.6 Dealer Orders

**Page:** `/dealer-orders`, `/dealer-orders/new`, `/dealer-orders/[id]`  
**API:** `GET/POST /v1/dealer-orders`, `POST /v1/dealer-orders/:id/{confirm,dispatch,deliver,payment,cancel}`

#### What it does
- Manages **wholesale / B2B orders** from dealers (customers who buy in bulk).
- Unlike retail Sales, dealer orders have a **staged workflow** and support partial payments.

#### Status workflow

```
DRAFT → CONFIRMED → DISPATCHED → DELIVERED
                         ↓
                      CANCELLED (reverses stock)
```

| Status | What happens |
|---|---|
| DRAFT | Order created, nothing reserved. Can edit items. |
| CONFIRMED | Order locked. No more edits. |
| DISPATCHED | **Stock deducted.** `StockMovement` (type `SALE`) created. If CREDIT: `Customer.creditBalance` incremented. |
| DELIVERED | Delivery confirmed. No further stock changes. |
| CANCELLED | If was DISPATCHED: **stock reversed** (StockMovement type `RETURN`). If CREDIT: `creditBalance` reversed. |

#### Payment tracking
- `paymentType`: CASH / CARD / UPI / CREDIT
- `paidAmount` increments on each `POST /v1/dealer-orders/:id/payment`
- `paymentStatus` auto-calculated: UNPAID → PARTIAL → PAID

#### Synchronizes with
- **Products** (reads variant prices for order total)
- **Customers** (creditBalance on dispatch/cancel, paidAmount on payment)
- **Stock Register** (StockMovements on dispatch/cancel)
- **Inventory / Current Stock** (currentStock changes on dispatch/cancel)

---

### 3.7 Purchase Orders

**Page:** `/purchase-orders`, `/purchase-orders/new`, `/purchase-orders/[id]`  
**API:** `GET/POST /v1/purchase-orders`, `POST /v1/purchase-orders/:id/{send,receive,cancel}`

#### What it does
- Manages **orders placed to suppliers** for replenishment.
- Tracks what was ordered vs what was actually received (supports partial delivery).

#### Status workflow

```
DRAFT → SENT → PARTIAL_RECEIVED → RECEIVED
           ↓
        CANCELLED
```

| Status | What happens |
|---|---|
| DRAFT | PO created, nothing committed |
| SENT | Communicated to supplier |
| PARTIAL_RECEIVED | Some items received (stock updated for received items) |
| RECEIVED | Fully received |
| CANCELLED | No stock changes |

#### On receive
- Each item: `receivedQty` updated
- Each received item: `ProductVariant.currentStock` incremented
- Each received item: `StockMovement` (type `PURCHASE`) created with `unitCost` and `supplierId`
- If all items fully received: status → `RECEIVED`, else → `PARTIAL_RECEIVED`

#### Payment tracking
- `paidAmount`, `paymentStatus` (UNPAID/PARTIAL/PAID) on the PO itself
- Tracks `Supplier.outstandingBalance`

#### Synchronizes with
- **Suppliers** (linked, tracks outstanding balance)
- **Products** (reads variants for line items)
- **Stock Register** (StockMovements on receive)
- **Inventory / Current Stock** (currentStock on receive)

---

### 3.8 Suppliers

**Page:** `/suppliers`, `/suppliers/new`, `/suppliers/[id]`  
**API:** `GET/POST/PATCH/DELETE /v1/suppliers`

#### What it does
- Master list of all vendors/distributors you buy from.
- Tracks contact info, GST number, average lead days, payment terms, outstanding balance.
- Shows purchase history (last 10 POs) and products linked to this supplier.

#### Data owned
- `Supplier`: name, contactPerson, email, phone, address, gstNumber, avgLeadDays, paymentTerms, outstandingBalance

#### What it affects
- **Products** — products can be linked to a supplier (know who to reorder from)
- **Purchase Orders** — every PO has a `supplierId`
- **Stock Movements** — movements can record `supplierId` for traceability
- **Sales** — optional supplier link on a sale

#### Key fields
- `avgLeadDays` — used to plan reorder timing
- `outstandingBalance` — money owed to supplier
- Soft-delete: `isActive = false` preserves historical data

---

### 3.9 Customers

**Page:** `/customers`, `/customers/new`, `/customers/[id]`  
**API:** `GET/POST/PATCH/DELETE /v1/customers`

#### What it does
- Master list of customers (walk-in or dealer/wholesale).
- Tracks credit balance and credit limit for credit sales.
- Shows purchase history (last 10 sales + last 10 dealer orders).

#### Data owned
- `Customer`: name, phone (unique), email, address, creditBalance, creditLimit

#### What updates creditBalance
| Action | Effect on creditBalance |
|---|---|
| Sale (CREDIT type) | + totalAmount |
| Sale voided (was CREDIT) | - totalAmount |
| Dealer Order dispatched (CREDIT type) | + totalAmount |
| Dealer Order cancelled (was DISPATCHED + CREDIT) | - totalAmount |
| `POST /v1/sales/settle-credit` | - settledAmount |
| `POST /v1/dealer-orders/:id/payment` | - paidAmount |

#### Synchronizes with
- **Sales** (creditBalance on CREDIT sales)
- **Dealer Orders** (creditBalance + paidAmount)
- **Reports** (customer history)

---

### 3.10 Reports / Analytics

**Page:** `/reports`  
**API:** `GET /v1/reports/{inventory-valuation,low-stock,dead-stock,sales-summary,stock-movements,top-sellers}`

#### What it does
- Read-only analytics across all modules. No data is written here.

#### Available reports

| Report | What it shows | Data source |
|---|---|---|
| **Inventory Valuation** | All active variants with currentStock × costPrice (total value) | ProductVariant |
| **Low Stock** | Variants where currentStock ≤ reorderPoint | ProductVariant |
| **Dead Stock** | Variants in stock but with no movement in last N days (default 60) | StockMovement + ProductVariant |
| **Sales Summary** | Revenue, COGS, gross margin for a date range | Sale, SaleItem (uses costAtSale for accurate COGS) |
| **Top Sellers** | Top N variants by quantity sold in a date range | SaleItem grouped by variantId |
| **Stock Movements** | All movements grouped by type in a date range | StockMovement |

#### Margin calculation
`grossMargin = (revenue - COGS) / revenue × 100`  
COGS uses `SaleItem.costAtSale` (the cost price at time of sale, not current cost price — so margin is accurate even after price changes).

---

### 3.11 Expenses

**Page:** `/expenses`  
**API:** `GET/POST/DELETE /v1/expenses`, `GET /v1/expenses/summary`

#### What it does
- Tracks operational costs (rent, utilities, salaries, miscellaneous, etc.).
- Provides category-wise breakdown for a date range.

#### Data owned
- `Expense`: category, amount, description, date, createdById

#### Synchronizes with
- Nothing else in the system — standalone financial module.
- Future: could be combined with Sales revenue to calculate net profit.

#### Expense categories
Free-text; common categories: RENT, UTILITIES, SALARY, MAINTENANCE, TRANSPORT, MARKETING, MISC.

---

### 3.12 Alerts

**Page:** `/alerts`  
**API:** `GET /v1/alerts/low-stock`

#### What it does
- Shows variants that have fallen below their reorder point.
- Sidebar badge shows the live count (auto-refreshes every 60 seconds).

#### How alerts are generated (two paths)

**Path 1 — Event-driven (immediate):**
1. Any stock change (Stock In, Sale, Manual Adjust, Dealer Dispatch) fires a `stock.low` event
2. Alerts module listens for `stock.low`
3. If `currentStock <= reorderPoint`: creates a `Notification` (type `LOW_STOCK` or `OUT_OF_STOCK`)

**Path 2 — Cron (hourly backup):**
1. `@Cron(CronExpression.EVERY_HOUR)` runs `checkLowStock()`
2. Scans all active variants
3. Creates/updates Notification records for any under-threshold variants

#### Synchronizes with
- **Inventory / Stock In / Sales / Dealer Orders** — any of these triggers the event
- **Notifications** — alert creates a Notification record
- **Sidebar** — reads unread count from Notifications every 30 seconds

---

### 3.13 Store Setup

**Page:** `/settings/store`  
**API:** `GET/PATCH /v1/settings`

#### What it does
- Configure store-wide settings stored as key-value pairs.

#### Default settings

| Key | Default value | Used by |
|---|---|---|
| `store_name` | (empty) | Receipts, UI header |
| `store_address` | (empty) | Receipts |
| `store_phone` | (empty) | Receipts |
| `store_email` | (empty) | Receipts |
| `pan_number` | (empty) | Tax invoices |
| `vat_number` | `13` | Tax calculation on receipts |
| `currency` | `रू` | All price displays |
| `receipt_footer` | (empty) | Printed receipts |

#### Synchronizes with
- Potentially all UI modules (currency symbol shown everywhere)
- Receipt generation (if implemented)

---

### 3.14 Settings (Users & Categories)

#### Users — `/settings/users`
**API:** `GET/POST/PATCH /v1/users`

- ADMIN-only. Lists, creates, updates users.
- Roles: `ADMIN` (full access), `MANAGER` (operations — can create/edit), `STAFF` (view only for most modules)
- Password hashed with bcrypt (12 rounds). Never stored in plain text.
- `isActive = false` disables login without deleting the user.

#### Categories — `/settings/categories`
**API:** `GET/POST/PATCH/DELETE /v1/categories`

- Organizes products into groups (Beer, Whisky, Rum, Wine, etc.).
- Each category has a `color` for UI accents.
- `slug` is auto-generated and unique.
- Used as a filter on the Products page.

---

## 4. How Modules Synchronize

### The central synchronization point: `ProductVariant.currentStock`

Every module that moves stock reads or writes this field. The rule is:

> **All stock changes go through `InventoryService.adjust()`** — this is the single source of truth. It validates, updates `currentStock`, writes a `StockMovement`, and fires the low-stock event.

```
Stock In ─────────────────────────────────┐
Purchase Order (receive) ─────────────────┤
                                          ▼
Sale (create) ────────────────────► InventoryService.adjust()
Sale (void) ──────────────────────►     │
                                         ├── Updates ProductVariant.currentStock
Dealer Order (dispatch) ──────────────►  ├── Creates StockMovement
Dealer Order (cancel) ─────────────────► └── Fires stock.low event
                                              │
Manual Adjustment (inventory page) ──────────►└── Alerts module → Notification
```

### Real-time synchronization chain

```
User Action
    │
    ├── API call to NestJS
    │       │
    │       ├── Updates DB (Prisma transaction — atomic)
    │       ├── Creates StockMovement (always)
    │       ├── Updates currentStock (always)
    │       └── Fires event (if stock.low)
    │
    └── Frontend (React Query)
            │
            ├── Mutation completes → invalidates related query cache
            └── Components re-render with fresh data
```

### Cache invalidation rules (TanStack Query)

| Action | Queries invalidated |
|---|---|
| Sale created | `sales`, `inventory`, `products`, `alerts` |
| Sale voided | `sales`, `inventory`, `products`, `alerts` |
| Stock In | `inventory`, `products`, `alerts` |
| PO received | `purchase-orders`, `inventory`, `products`, `alerts` |
| Dealer Order dispatched | `dealer-orders`, `inventory`, `products`, `customers`, `alerts` |
| Product variant updated | `products`, `inventory` |
| Expense created | `expenses` |
| Customer updated | `customers` |

---

## 5. Stock Movement Flow

### Complete lifecycle of stock

```
SUPPLIER
   │
   ├─► Stock In (quick)
   │       └── StockMovement: PURCHASE
   │
   └─► Purchase Order
           ├── DRAFT (no stock change)
           ├── SENT (no stock change)
           ├── PARTIAL_RECEIVED
           │       └── StockMovement: PURCHASE (for received qty only)
           └── RECEIVED
                   └── StockMovement: PURCHASE (remaining qty)

WAREHOUSE (current stock)
   │
   ├─► Sale (retail)
   │       └── StockMovement: SALE
   │       └── [if voided] → StockMovement: RETURN
   │
   ├─► Dealer Order
   │       └── [on DISPATCH] → StockMovement: SALE
   │       └── [if CANCELLED after dispatch] → StockMovement: RETURN
   │
   └─► Manual Adjustment
           ├── StockMovement: ADJUSTMENT
           ├── StockMovement: WASTAGE
           └── StockMovement: TRANSFER
```

### StockMovement fields
```typescript
{
  variantId:     string   // which product variant
  type:          PURCHASE | SALE | ADJUSTMENT | WASTAGE | RETURN | TRANSFER
  quantity:      number   // positive = in, negative = out
  balanceAfter:  number   // currentStock after this movement (snapshot)
  reason:        string   // human note
  referenceId:   string   // links to Sale.id, PurchaseOrder.id, DealerOrder.id
  referenceType: string   // "SALE", "PURCHASE_ORDER", "DEALER_ORDER", "MANUAL"
  invoiceNumber: string   // for PURCHASE type
  unitCost:      number   // cost at time of movement
  supplierId:    string   // for PURCHASE type
  createdById:   string   // who did it
}
```

---

## 6. Financial Flow

### Money in
```
Retail Sale (CASH/CARD/UPI) → Revenue (immediate)
Retail Sale (CREDIT) → Customer.creditBalance++ (deferred)
    └── Settle credit → Customer.creditBalance--

Dealer Order → Customer.paidAmount tracks payments
```

### Money out
```
Purchase Order → Supplier.outstandingBalance (payable)
Expenses → Expense table (operational costs)
```

### Margin tracking
```
Revenue (Sale.totalAmount)
  - COGS (SaleItem.costAtSale × quantity)
  = Gross Profit
  - Expenses (Expense.amount)
  = Net Profit (calculated in Reports page)
```

---

## 7. Role Permissions

| Action | ADMIN | MANAGER | STAFF |
|---|---|---|---|
| View all pages | ✅ | ✅ | ✅ |
| Create / edit products | ✅ | ✅ | ❌ |
| Delete products | ✅ | ❌ | ❌ |
| Create sales | ✅ | ✅ | ❌ |
| Void sales | ✅ | ✅ | ❌ |
| Create / receive purchase orders | ✅ | ✅ | ❌ |
| Cancel purchase orders | ✅ | ✅ | ❌ |
| Create / dispatch dealer orders | ✅ | ✅ | ❌ |
| Stock In | ✅ | ✅ | ❌ |
| Manual stock adjust | ✅ | ✅ | ❌ |
| Create / edit suppliers | ✅ | ✅ | ❌ |
| Delete suppliers | ✅ | ❌ | ❌ |
| Create / edit categories | ✅ | ✅ | ❌ |
| Delete categories | ✅ | ❌ | ❌ |
| Create expenses | ✅ | ✅ | ❌ |
| Delete expenses | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Store settings | ✅ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ |

---

## 8. Key Invariants

These rules are enforced at the API level and must never be broken:

1. **Stock cannot go negative.** Every stock deduction validates `currentStock >= quantity` before committing. The transaction rolls back if this fails.

2. **All stock changes create a StockMovement.** There is no direct update to `currentStock` without a corresponding movement record. The audit trail is complete.

3. **`costAtSale` is captured at sale time.** `SaleItem.costAtSale` stores the variant's cost price when the sale was created — not the current cost price. This ensures margin reports stay accurate even after future price changes.

4. **PO over-receipt is prevented.** `receivedQty` cannot exceed `orderedQty` on any `PurchaseOrderItem`.

5. **Dealer Order dispatch is all-or-nothing per item.** Partial dispatch of a line item is not supported. If items have `orderedQty = 10`, all 10 must be dispatched together.

6. **Soft deletes preserve history.** Products, Suppliers, and Customers are never hard-deleted — `isActive = false` is used. All historical movements, sales, and orders remain intact.

7. **SKU uniqueness.** `Product.sku` is unique across the entire catalog.

8. **Barcode uniqueness.** `ProductVariant.barcode` is unique across all variants.

9. **Sale void reverses credit.** If a CREDIT sale is voided, `Customer.creditBalance` is decremented to match.

10. **JWT is required for all routes except `/auth/login`.** The middleware checks for the `access_token` cookie or `Authorization: Bearer` header.

---

## Quick Reference: Which module to use for what

| Task | Module |
|---|---|
| Add a new product with sizes | Products → New |
| Receive goods from supplier quickly | Stock In |
| Create a formal order to supplier | Purchase Orders → New |
| Record a walk-in sale | Sales |
| Record a wholesale order for a dealer | Dealer Orders → New |
| Check current stock levels | Current Stock (Inventory) |
| See full history of a product's stock | Stock Register |
| See who bought what and when | Customers → [customer detail] |
| Check how much I owe a supplier | Suppliers → [supplier detail] |
| See which products are running low | Alerts |
| Calculate profit for the month | Reports → Sales Summary |
| Find slow-moving products | Reports → Dead Stock |
| Track daily operational costs | Expenses |
| Change store name / tax rate | Store Setup |
| Add a new staff user | Settings → Users |
| Organize products into categories | Settings → Categories |

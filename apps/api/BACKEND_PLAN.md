# Backend Plan — LiquorERP API

## Stack
- **NestJS 10** — modular, decorator-based, DI
- **PostgreSQL 16** — ACID-compliant relational DB
- **Prisma 7** — type-safe ORM + migrations
- **JWT** (HttpOnly cookies + Bearer) — auth
- **Passport.js** — local + JWT strategies
- **Swagger/OpenAPI** — auto-generated API docs at `/docs`
- **class-validator + class-transformer** — DTO validation
- **@nestjs/schedule** — cron jobs (low stock check)
- **@nestjs/event-emitter** — domain events (stock.low)
- **@nestjs/throttler** — rate limiting
- **Helmet + Compression** — security + perf middleware

## Folder Structure
```
src/
├── main.ts                    ← Bootstrap (Swagger, pipes, middleware)
├── app.module.ts              ← Root module (imports all)
├── common/
│   ├── prisma/                ← Global PrismaService + PrismaModule
│   ├── guards/                ← JwtAuthGuard, RolesGuard
│   ├── decorators/            ← @CurrentUser, @Roles
│   ├── filters/               ← AllExceptionsFilter
│   ├── interceptors/          ← (logging, transform)
│   └── pipes/                 ← (parse, validate)
├── modules/
│   ├── auth/                  ← Login, logout, JWT, strategies
│   ├── users/                 ← CRUD, role management
│   ├── products/              ← Product + variant CRUD
│   ├── inventory/             ← Stock movements, adjustments
│   ├── suppliers/             ← Vendor CRUD
│   ├── purchase-orders/       ← PO create, receive, cancel
│   ├── sales/                 ← Sale create, void
│   ├── reports/               ← Analytics queries
│   ├── alerts/                ← Cron + event listeners
│   └── audit/                 ← Audit log write + read
└── config/                    ← Config factories (db, jwt)
```

## API Endpoints (v1)

### Auth
| Method | Path | Description |
|---|---|---|
| POST | /v1/auth/login | Login (sets HttpOnly cookie) |
| POST | /v1/auth/logout | Clear cookie |
| GET | /v1/auth/me | Current user |

### Products
| Method | Path | Auth |
|---|---|---|
| GET | /v1/products | JWT |
| GET | /v1/products/low-stock | JWT |
| GET | /v1/products/:id | JWT |
| POST | /v1/products | ADMIN, MANAGER |
| PATCH | /v1/products/:id | ADMIN, MANAGER |
| DELETE | /v1/products/:id | ADMIN |

### Inventory
| Method | Path | Auth |
|---|---|---|
| GET | /v1/inventory/movements | JWT |
| GET | /v1/inventory/summary | JWT |
| POST | /v1/inventory/adjust | JWT |

### Suppliers
| Method | Path | Auth |
|---|---|---|
| GET/POST | /v1/suppliers | JWT |
| GET/PATCH/DELETE | /v1/suppliers/:id | JWT |

### Purchase Orders
| Method | Path | Auth |
|---|---|---|
| GET | /v1/purchase-orders | JWT |
| POST | /v1/purchase-orders | JWT |
| GET | /v1/purchase-orders/:id | JWT |
| POST | /v1/purchase-orders/:id/receive | JWT |
| POST | /v1/purchase-orders/:id/cancel | JWT |

### Sales
| Method | Path | Auth |
|---|---|---|
| GET | /v1/sales | JWT |
| GET | /v1/sales/daily-summary | JWT |
| POST | /v1/sales | JWT |
| POST | /v1/sales/:id/void | JWT |

### Reports
| Method | Path | Auth |
|---|---|---|
| GET | /v1/reports/inventory-valuation | JWT |
| GET | /v1/reports/low-stock | JWT |
| GET | /v1/reports/dead-stock | JWT |
| GET | /v1/reports/sales-summary | JWT |
| GET | /v1/reports/stock-movements | JWT |

### Alerts & Audit
| Method | Path |
|---|---|
| GET | /v1/alerts/low-stock |
| GET | /v1/audit |

## Key Patterns
- **Global PrismaModule** — injected into all modules, single connection pool
- **CQRS-lite** — services handle both commands and queries (sufficient for this scale)
- **Event-driven** — `EventEmitter2` for cross-module events (stock.low → alerts)
- **Cron jobs** — hourly low-stock sweep via `@nestjs/schedule`
- **Audit trail** — `AuditService.log()` called on every write operation
- **DTO validation** — `class-validator` + `ValidationPipe` at global scope
- **Rate limiting** — 100 req/min via `ThrottlerModule`
- **Role hierarchy** — ADMIN > MANAGER > STAFF enforced via `RolesGuard`

## Database (Prisma)
- Schema: `apps/api/prisma/schema.prisma`
- Seed: `apps/api/prisma/seed.ts` (creates admin user + categories)
- All soft-deletes via `isActive: false`
- All IDs: CUID (collision-resistant)
- Audit log captures old + new JSON values for every mutation

## Libraries Used
| Library | Purpose |
|---|---|
| `@nestjs/*` | Framework + modules |
| `prisma + @prisma/client` | ORM + type-safe queries |
| `passport + passport-jwt` | Auth strategies |
| `bcryptjs` | Password hashing |
| `class-validator` | DTO validation |
| `@nestjs/swagger` | API docs |
| `helmet` | Security headers |
| `compression` | Response compression |
| `@nestjs/schedule` | Cron jobs |
| `@nestjs/event-emitter` | Domain events |
| `@nestjs/throttler` | Rate limiting |

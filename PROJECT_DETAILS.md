# Ponnaloy — Project Details

**A complete engineering reference for the repository, its architecture, features, data model, API surface, operations and current quality status.**

| Field | Value |
|---|---|
| Project name | Ponnaloy E-Commerce Platform |
| Document version | 1.3 |
| Last updated | 2026-10-29 |
| Repository version | Root package `2.0.0`, Batches 01–05 (Batch 05: multi-vendor marketplace foundation) |
| Primary status | Active development — functional multi-vendor marketplace with admin, seller and customer portals, tested commerce API, production MongoDB schema applied; deployment, card payments, email and WCAG AA conformance pending |
| Audience | Engineers, reviewers, DevOps, product stakeholders |
| Secret handling | This document lists environment variable **names only**. No credentials, keys or customer data are reproduced. |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Feature Catalogue](#3-feature-catalogue)
4. [Repository Map](#4-repository-map)
5. [Technology Stack](#5-technology-stack)
6. [Architecture](#6-architecture)
7. [Data Model](#7-data-model)
8. [API Reference](#8-api-reference)
9. [Frontend Application](#9-frontend-application)
10. [Core Commerce Flows](#10-core-commerce-flows)
11. [Security Model](#11-security-model)
12. [Configuration](#12-configuration)
13. [Local Development](#13-local-development)
14. [Deployment](#14-deployment)
15. [Quality & Verification](#15-quality--verification)
16. [Risk Register](#16-risk-register)
17. [Roadmap](#17-roadmap)
18. [Conventions & Glossary](#18-conventions--glossary)
19. [Change Log](#19-change-log)

---

## 1. Executive Summary

Ponnaloy is a **multi-stack e-commerce codebase** that has evolved through three architectural generations. The repository currently contains:

- A **modern storefront** — `apps/web`, Next.js 15 (App Router) + React 19 + TypeScript + Tailwind/Radix.
- A **modern API** — `apps/api`, Fastify 5 + Prisma 6 + MongoDB, with Redis caching, Meilisearch search, Stripe/Clerk integration points, Prometheus metrics and Pino logging.
- A **legacy application** — `backend/` (Express 4 + SQLite) and `frontend/` (vanilla HTML/CSS/JS), still present and runnable, but superseded.

The **active target** is `apps/web` + `apps/api` + `packages/shared`. The legacy stack is frozen rather than deleted so that no working behaviour is lost while the modern stack reaches parity.

The platform is a **multi-vendor marketplace** with three server-enforced portals: customers, sellers and platform administrators. The marketplace layer is additive: platform-owned products (`sellerId: null`) keep working exactly as before, while seller-owned products are tenant-scoped, moderated before publication and fulfilled through independent seller-order partitions. B2B wholesale, payouts and dispute resolution remain future work.

### Current health at a glance

| Dimension | Status | Evidence |
|---|---|---|
| Storefront production build | **PASS** | `next build` — 36/36 pages generated |
| Storefront type safety | **PASS** | `tsc --noEmit` |
| API type safety | **PASS** | `tsc --noEmit` — 0 diagnostics across all modules |
| Lint | **PASS** | ESLint flat configs; 0 errors (56 web warnings) |
| Automated tests | **PASS** | Vitest: 41/41 (10 pricing unit + 31 API integration, including 12 marketplace tests) |
| Live order-flow E2E | **PASS** | 106/106 assertions over real HTTP against a MongoDB replica set (catalog → cart → checkout → fulfilment → return/refund) |
| Marketplace E2E (API) | **PASS** | Seller onboarding, moderation, tenant isolation, multi-vendor checkout, independent fulfilment, suspension, commission audit |
| API runtime (in-memory replica set) | **PASS** | Booted with `tsx`; health `200`, database `connected`, payment methods `COD`/`BANK_TRANSFER` |
| Security headers / CSP | **PASS** | CSP emitted by the built server; verified from the HTTP response |
| Admin workspace | **PASS** | Dashboard, products, orders, customers, sellers, moderation read/write live API data |
| Seller portal | **PASS** | Application, dashboard, products, orders, analytics and storefront wired to live API data |
| Production database | **PASS** | Atlas cluster reachable; schema pushed; 32 products and 2 orders preserved; API booted with `database: connected` |
| Deployment readiness | **BLOCKED** | No hosting credentials; production build not deployed |
| Docker Compose | **NOT RUN** | Docker is not installed in this environment |
| Playwright / axe | **FAIL** | Installed and executed: 8/18 passed. 10 failures: WCAG AA colour-contrast and icon-button-name violations on storefront pages; catalogue smoke blocked by CORS on the test port |

---

## 2. Product Overview

### 2.1 Vision

A premium, secure, conversion-oriented commerce platform that begins as a disciplined B2C storefront and grows into a B2C + B2B multi-vendor marketplace without abandoning its existing stack or its users' data.

### 2.2 Target audiences

| Audience | Needs served today | Needs served later |
|---|---|---|
| Consumers | Discover, compare, cart, checkout, track orders, manage account, shop multiple sellers in one order | Personalisation, loyalty, faster checkout, multi-currency |
| Store operators | Catalog/order/customer administration, seller approvals, catalogue moderation, commissions | Campaigns, settlements, performance analytics |
| Third-party sellers | Onboarding, tenant-isolated catalogue, seller-order fulfilment, storefront, analytics | Payouts, disputes, promoted listings |
| Business buyers | — | Company accounts, MOQ, tier pricing, quotations, approvals |

### 2.3 Engineering principles

1. **Project-first** — extend what exists; no blind rebuilds.
2. **Honesty over surface area** — no advertised capability without a working server path.
3. **Server authority** — prices, stock, discounts and totals are computed server-side.
4. **Idempotent money operations** — retries must never duplicate an order.
5. **Graceful degradation** — Redis and Meilisearch outages must not take down the catalog.
6. **Additive change** — schema and API evolution preserve existing behaviour.

### 2.4 Product scope

| Horizon | Scope |
|---|---|
| **Now** | Multi-vendor marketplace: catalog, variants, cart, checkout (offline payment), multi-vendor orders, seller onboarding/moderation/fulfilment, commissions, reviews, wishlist, addresses, accounts, admin workspace, seller portal, AI shopping assistant |
| **Next** | Production database cutover, CI pipeline, object storage, email delivery, card payments, account recovery, seller payouts |
| **Later** | B2B wholesale/RFQ, disputes, internationalisation, promoted listings |

---

## 3. Feature Catalogue

Status legend: **Implemented** = works end-to-end · **Partial** = server or UI side only · **Scaffolded** = code exists but is intentionally inactive without configuration · **Planned** = not built.

### 3.1 Customer-facing

| Feature | Status | Notes |
|---|---|---|
| Product catalog with filters, sort, pagination | Implemented | Category, brand, price, rating, availability, status filters |
| Featured / trending / new arrivals / deals rails | Implemented | Dedicated API endpoints |
| Product detail with image gallery, variants, specs, reviews | Implemented | Variant-aware pricing and stock |
| Product-level inventory | Implemented | `Product.stock` added in Batch 01; variant stock remains authoritative when variants exist |
| Search | Implemented | Meilisearch when available; database filters otherwise |
| Cart (authenticated) | Implemented | Persisted in MongoDB |
| Cart (guest) | Implemented | Local storage; merged/synced on sign-in |
| Coupons | Implemented | Validation endpoint plus server-side revalidation at checkout |
| Wishlist | Implemented | Context/local state plus API persistence |
| Checkout | Implemented | Three-step UI, server-authoritative totals |
| Payments | **Partial** | Cash on Delivery and Bank Transfer are real; card/PayPal are disabled until a gateway is configured |
| Orders and order history | Implemented | Status timeline, cancellation with stock restock |
| Reviews | Implemented | One review per user per product (schema constraint) |
| Addresses | Implemented | Default address support |
| Account dashboard | Implemented | Profile, orders, wishlist, addresses tabs |
| Authentication | Implemented | Email + password, JWT |
| Password reset | **Partial** | Endpoint returns a neutral message; no email delivery yet |
| Email verification | **Planned** | Field exists in schema |
| Notifications | **Partial** | API present; UI consumption limited |
| AI shopping assistant | **Scaffolded** | SSE streaming chat; requires `OPENAI_API_KEY` |
| Newsletter subscription | Implemented | Persisted since Batch 01 |
| Reviews moderation | **Partial** | API supports deletion by owner/admin |
| Returns/refunds workflow | **Partial** | Models exist; no customer or admin workflow |
| Multi-currency / i18n | **Planned** | USD only |
| Multi-vendor checkout | Implemented | Cart is grouped by seller; one parent order with independent seller partitions |
| Seller storefronts | Implemented | Public directory and per-seller storefront with moderated products |
| Seller attribution on product detail | Implemented | Links to the seller's public storefront |
| B2B / RFQ / quotes | **Planned** | — |

### 3.2 Administration

| Capability | Status | Notes |
|---|---|---|
| Admin role guards | Implemented | `ADMIN` / `SUPER_ADMIN`, enforced on every `/api/admin/*` route; the web guard is UX only |
| Dashboard statistics | Implemented | Live revenue (cancelled excluded), order/product/customer counts, 30-day daily revenue, pending fulfilment, low stock |
| Product CRUD | Implemented | Real list/search/status filters/pagination, create/edit dialog, image upload, archive-or-delete semantics |
| Order listing and status updates | Implemented | Full detail dialog, state machine, forced overrides with mandatory notes, carrier/tracking capture, audit history |
| Customer listing, role change, activation toggle | Implemented | Search/role filters, self-action protection, last-super-admin protection |
| Category / brand / banner / collection management | Implemented (API) | Admin screens for categories and banners are still "coming soon" placeholders; categories are consumed by the product editor |
| Coupon management | Implemented (API) | No dedicated admin screen yet |
| Seller application review | Implemented | Queue with approve/reject and reviewer notes; approval activates the organization |
| Seller directory and suspension | Implemented | Search/filter, suspend/reinstate, commission-rate dialog |
| Catalogue moderation queue | Implemented | Pending/approved/rejected queues with mandatory rejection notes |
| Audit trail | Implemented (partial) | `OrderStatusLog` and `SellerOrderStatusLog` record actor and role; `ActivityLog` records seller, moderation and commission changes |
| Commission and settlement management | **Partial** | Commission rates and accrued commission are managed; payout execution and ledger reconciliation are **not implemented** |
| Dispute management | **Planned** | — |

### 3.3 Platform capabilities

| Capability | Status | Notes |
|---|---|---|
| Health endpoint | Implemented | `/api/health/live` (process) and `/api/health` (dependency readiness, `503` when the database is disconnected) |
| Metrics endpoint | Implemented | Prometheus `prom-client` |
| Structured logging | Implemented | Pino; pretty transport in development |
| Rate limiting | Implemented | Global 120 req/min plus per-route limits |
| Security headers | Implemented | Web: full header set including CSP. API: Helmet (CSP in production) |
| Caching | Implemented | Redis with in-process fallback behaviour on outage |
| Search indexing | Implemented | Meilisearch index maintenance |
| File upload | Implemented (local) | MIME/size validation, random filenames, disk driver under `UPLOAD_DIR`, served at `/uploads/*`; R2/S3 is a future adapter |
| Webhooks | Implemented | Stripe and Clerk signature verification with raw-body preservation |
| Idempotent order creation | Implemented | Batch 01 claim record |
| OpenAPI documentation | **Planned** | Swagger packages installed but not registered |
| Automated tests | Implemented | 40 Vitest tests: pricing units, commerce API integration and marketplace integration against an in-memory MongoDB replica set |
| CI pipeline | **Planned** | No workflow definitions |

---

## 4. Repository Map

```text
Ponnaloy-e-com/
├── apps/
│   ├── api/                     # Fastify + Prisma backend (active)
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # 36 models, 13 enums (MongoDB)
│   │   │   └── seed.ts          # 8 categories, 46 products, brands, images
│   │   ├── src/
│   │   │   ├── config/env.ts    # Boot-time configuration validation
│   │   │   ├── lib/             # prisma, redis, meili, openai, chat, storage, permissions, marketplace
│   │   │   ├── middleware/      # auth, seller membership/permission guards
│   │   │   ├── routes/          # 24 route modules
│   │   │   ├── services/        # shared pricing/coupon evaluator
│   │   │   ├── validators/      # Zod schemas
│   │   │   └── server.ts        # Exported `buildServer()` + bootstrap
│   │   └── test/                # Vitest unit + integration suites
│   └── web/                     # Next.js storefront (active)
│       ├── public/
│       └── src/
│           ├── app/             # App Router pages (27 routes)
│           ├── components/      # UI kit, layout, products, chat
│           ├── contexts/        # Auth, cart, wishlist
│           ├── hooks/
│           ├── lib/             # API client, utils, validation
│           └── types/
├── packages/
│   └── shared/                  # Shared constants, types, utilities
├── backend/                     # Legacy Express 4 + SQLite API (frozen)
│   ├── db.js                    # Schema, queries, seeding
│   ├── routes/
│   ├── middleware/
│   └── server.js
├── frontend/                    # Legacy vanilla JS storefront (frozen)
│   ├── public/                  # 6 HTML pages, styles, 14 JS modules
│   └── build.js
├── data/                        # Legacy SQLite database location
├── server.js                    # Legacy entry point used by `pnpm dev:legacy`
├── docker-compose.yml           # MongoDB single-node replica set, Redis, Meilisearch
├── render.yaml                  # API deployment (Render)
├── apps/web/vercel.json         # Storefront deployment (Vercel)
├── turbo.json                   # Monorepo task graph
├── pnpm-workspace.yaml
├── package.json
└── PROJECT_DETAILS.md           # This document
```

### 4.1 Known repository hygiene issues

- Compiled artefacts are tracked: `packages/shared/src/*.js`, `*.d.ts`, `*.map`; `apps/api/prisma/seed.js`; `apps/api/api-dev.log`.
- `.gitignore` excludes `*.db`, `.env` and local `uploads/`, but historical build output and logs remain in git history.
- **Resolved in Batch 02:** `docker-compose.yml` now provisions the MongoDB replica set the application actually requires, instead of PostgreSQL.

---

## 5. Technology Stack

### 5.1 Storefront — `apps/web`

| Concern | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5.20 |
| UI runtime | React / React DOM | 19 |
| Language | TypeScript | ^5.7 |
| Styling | Tailwind CSS + `tailwindcss-animate` | ^3.4 |
| Components | Radix UI primitives, shadcn-style wrappers | Various |
| Animation | Framer Motion | ^11.12 |
| Icons | lucide-react | ^0.468 |
| Theming | next-themes (class strategy, system default) | ^0.4 |
| Forms | react-hook-form + Zod + `@hookform/resolvers` | ^7.54 / ^3.24 |
| Data fetching | Native `fetch` wrapper; React Query available | ^5.62 |
| Auth client | `@clerk/nextjs` installed; **application uses custom JWT** | ^6 |
| Lint | ESLint 9 + `eslint-config-next` | Flat config (`eslint.config.mjs`) present |

### 5.2 API — `apps/api`

| Concern | Technology | Version |
|---|---|---|
| Framework | Fastify | ^5.2 |
| Language | TypeScript executed with `tsx` | ^5.7 |
| ORM | Prisma Client | ^6.1 (resolved 6.19.3) |
| Database | MongoDB (replica-set URI) | — |
| Cache | Redis (`ioredis`) | ^5.4 |
| Search | Meilisearch client | ^0.44 |
| Validation | Zod | ^3.24 |
| Auth | Custom HS256 JWT + scrypt; Clerk verification fallback | — |
| Payments | Stripe SDK (inactive without keys) | ^17.4 |
| AI | OpenAI SDK | ^4.77 |
| Uploads | `@fastify/multipart`, `@fastify/static`; local disk driver (`src/lib/storage.ts`); AWS S3 SDK present but unused |
| Testing | Vitest 5, `mongodb-memory-server` (replica set), Fastify `inject` |
| Observability | Pino, prom-client |
| Security | `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cors` | — |

### 5.3 Shared — `packages/shared`

- Enumerations: roles, order status, payment status/method, discount type, notification type, banner position.
- Domain constants: page sizes, free-shipping threshold, shipping fee, tax rate, cache TTLs and keys.
- Utilities: `slugify`, `formatCurrency`, `formatPrice`, `calculateDiscount`, `generateOrderNumber`.

**Money convention:** all monetary values in the modern stack are **integer cents** (`$19.99 → 1999`). The legacy stack uses dollars. Never mix the two.

### 5.4 Legacy — `backend/` + `frontend/`

| Concern | Technology |
|---|---|
| Server | Express 4 |
| Database | SQLite via `sqlite3` |
| Sessions | `express-session` + `connect-sqlite3` |
| Security | Helmet (CSP disabled), rate limiting, bcryptjs |
| Frontend | Static HTML + vanilla JS, GSAP, AOS |
| AI | Optional OpenAI assistant with keyword fallback |

---

## 6. Architecture

### 6.1 Runtime topology

```text
┌──────────────────────────────┐
│  Browser                     │
│  Next.js 15 storefront       │
│  React Context state         │
│  JWT in localStorage         │
└──────────────┬───────────────┘
               │ HTTPS / JSON + Bearer JWT
               ▼
┌──────────────────────────────┐
│  Fastify API (:3001)         │
│  ├─ CORS + Helmet + limits   │
│  ├─ Zod validation           │
│  ├─ JWT auth / role guards   │
│  ├─ Route modules            │
│  └─ Webhooks (signed)        │
└───┬──────────┬──────────┬────┘
    │          │          │
    ▼          ▼          ▼
 MongoDB     Redis     Meilisearch
 (Prisma)   (cache)    (search)
```

Optional external services: Stripe (card payments, inactive), Clerk (identity webhooks, inactive), OpenAI (assistant, inactive), S3/R2 (storage, not wired).

### 6.2 Application layers

| Layer | Responsibility | Location |
|---|---|---|
| Presentation | Pages, components, design system | `apps/web/src/app`, `components` |
| Client state | Auth, cart, wishlist, theme, toasts | `apps/web/src/contexts`, `components/layout` |
| API transport | Typed fetch wrapper, token injection | `apps/web/src/lib/api.ts` |
| HTTP boundary | CORS, headers, rate limits, parsing | `apps/api/src/server.ts` |
| Authentication | JWT verification, role checks, optional auth | `apps/api/src/middleware/auth.ts` |
| Validation | Request schemas | `apps/api/src/validators` |
| Domain/application | Catalog, cart, orders, payments, users | `apps/api/src/routes` |
| Domain services | Shared coupon evaluation and order totals | `apps/api/src/services/pricing.ts` |
| Media storage | Validated local uploads served at `/uploads/*` | `apps/api/src/lib/storage.ts` |
| Data access | Prisma Client + cache/index adapters | `apps/api/src/lib` |
| Persistence | MongoDB collections | `apps/api/prisma/schema.prisma` |

### 6.3 Request lifecycle

1. Browser issues a request to `NEXT_PUBLIC_API_URL`.
2. Fastify applies CORS, Helmet headers and the global rate limit.
3. Route-level Zod schema validates input.
4. `requireAuth` / `requireAdmin` / `optionalAuth` resolves the caller.
5. The handler reads or mutates data through Prisma.
6. Cache reads/writes (Redis) and index updates (Meilisearch) run where applicable; failures degrade rather than crash.
7. Structured logs are emitted; errors pass through the global error handler.
8. JSON response `{ success, data | error, pagination? }` is returned.

### 6.4 Caching and search

- **Cache:** read-through with TTL tiers (short/medium/long/day); invalidated on product mutation. If Redis is unavailable, caching is skipped and requests continue against the database.
- **Search:** Meilisearch index for query endpoints; catalog list endpoints fall back to Prisma filters.
- **Failure mode:** Redis and Meilisearch connection failures are logged as warnings at boot and the API continues.

### 6.5 Observability

| Signal | Endpoint / mechanism |
|---|---|
| Liveness | `GET /api/health/live` (process only) |
| Readiness and dependency status | `GET /api/health` (`503` when the database is disconnected) |
| Prometheus metrics | `GET /api/metrics` |
| Structured logs | Pino (JSON in production, pretty in development) |
| Order audit trail | `OrderStatusLog` with `actorId`, `actorRole`, note and timestamp |
| Admin audit | `ActivityLog` model (defined, not yet written by routes) |

---

## 7. Data Model

### 7.1 Prisma models (36)

| Domain | Models |
|---|---|
| Identity | `User` |
| Catalog | `Product`, `ProductImage`, `ProductVariant`, `ProductSpec`, `ProductRelation`, `Category`, `Brand`, `Collection`, `ProductCollection` |
| Commerce | `Cart`, `CartItem`, `CartCoupon`, `Order`, `OrderItem`, `OrderStatusLog`, `Payment`, `Shipment`, `ReturnRequest`, `Coupon` |
| Marketplace | `SellerOrganization`, `SellerMembership`, `SellerApplication`, `SellerOrder`, `SellerOrderStatusLog` |
| Customer | `Address`, `Wishlist`, `Review`, `ReviewVote`, `Notification` |
| Content | `Banner`, `StoreSetting` |
| Platform | `ActivityLog`, `SearchDocument`, `IdempotencyRecord`, `NewsletterSubscriber` |

Batch 03 fields: `Order.restockedAt` (idempotent inventory return) and `OrderStatusLog.actorId` / `actorRole` (staff attribution). Both are optional so historical rows remain valid.

Marketplace fields: `Product.sellerId` / `moderationStatus` / `moderationNote`, `Order.sellerOrders`, `OrderItem.sellerOrderId` and `Shipment.sellerOrderId`. Platform-owned products keep `sellerId: null`; seller-created products start as `DRAFT` with `moderationStatus: PENDING`.

### 7.2 Enumerations (13)

| Enum | Values |
|---|---|
| `Role` | CUSTOMER, SELLER, ADMIN, SUPER_ADMIN |
| `ProductStatus` | DRAFT, ACTIVE, ARCHIVED |
| `ModerationStatus` | PENDING, APPROVED, REJECTED |
| `OrderStatus` | PENDING, CONFIRMED, PROCESSING, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURNED, REFUNDED |
| `PaymentStatus` | PENDING, PROCESSING, SUCCEEDED, FAILED, REFUNDED, PARTIALLY_REFUNDED |
| `PaymentMethod` | STRIPE, PAYPAL, SSLCOMMERZ, RAZORPAY, COD, BANK_TRANSFER |
| `DiscountType` | PERCENTAGE, FIXED, FREE_SHIPPING |
| `ReturnStatus` | Model-defined return lifecycle |
| `NotificationType` | ORDER, PAYMENT, SHIPPING, REFUND, PROMOTION, SYSTEM |
| `BannerPosition` | HERO, SIDEBAR, PROMO |
| `SellerStatus` | PENDING, APPROVED, REJECTED, SUSPENDED |
| `SellerMemberRole` | OWNER, MANAGER, STAFF |
| `SellerApplicationStatus` | SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CHANGES_REQUESTED |

### 7.3 Key entity relationships

```text
User 1─1 Cart 1─* CartItem *─1 Product
User 1─* Order 1─* OrderItem *─1 Product
Order 1─* Payment
Order 1─* OrderStatusLog
Order 1─? ReturnRequest
Order 1─* Shipment
Product 1─* ProductVariant
Product 1─* ProductImage / ProductSpec
Category 1─* Product        Brand 1─* Product
User 1─* Address / Review / Wishlist / Notification
Coupon 1─? CartCoupon
User 1─* SellerMembership *─1 SellerOrganization 1─* Product
SellerOrganization 1─* SellerApplication
Order 1─* SellerOrder *─1 SellerOrganization
SellerOrder 1─* OrderItem (via OrderItem.sellerOrderId)
SellerOrder 1─* SellerOrderStatusLog
SellerOrder 1─* Shipment (optional partition link)
```

### 7.4 Inventory and pricing rules

| Rule | Implementation |
|---|---|
| Inventory source | Variant stock when variants exist; otherwise `Product.stock` |
| Availability filter | Product in stock **or** any variant in stock |
| Order-time validation | Quantity must be a positive integer ≤ 999 and ≤ available stock |
| Reservation | Conditional atomic decrement (`stock >= quantity`) per document |
| Rollback | Successful decrements are compensated if any later reservation or write fails |
| Totals | Recomputed from persisted prices; client totals are never trusted |
| Shipping | Free at or above `FREE_SHIPPING_THRESHOLD` (15000 cents = $150); otherwise `DEFAULT_SHIPPING_FEE` (1500 cents = $15) |
| Tax | `TAX_RATE` (8%) exists in shared constants, but orders currently persist `tax: 0` — **tax calculation is not implemented** |
| Coupon | One evaluator (`services/pricing.ts`) shared by preview and checkout; revalidated for active state, date window, usage limit, minimum order and maximum discount; clamped to the subtotal |
| Free-shipping coupon | Sets shipping to zero |
| Idempotency | `IdempotencyRecord` with a required primary key `userId:key` |
| Cancellation | Customer cancellation uses a conditional atomic update; only `PENDING`/`CONFIRMED` can cancel; a second attempt returns `409 ORDER_NOT_CANCELLABLE` |
| Admin status changes | Explicit transition map; conditional atomic update; retry on Mongo write conflict; forced overrides require a note |
| Restocking | Only `CANCELLED`/`RETURNED`; guarded by `Order.restockedAt` and `SellerOrder.restockedAt`, so repeated or forced transitions cannot double-restock |
| Product deletion | Referenced products are archived; unreferenced products are removed with dependents in one transaction |
| Seller visibility | Public catalogue requires `Product.status = ACTIVE`, `moderationStatus = APPROVED` and an `APPROVED` seller (or a platform product) |
| Seller product lifecycle | Seller-created/edited listings start or return to `DRAFT` + `PENDING`; admin approval publishes them |
| Multi-vendor partitioning | Cart lines are grouped by seller; each group becomes a `SellerOrder` with proportional shipping/discount allocation that sums exactly to the parent totals |
| Commission | Basis points on the seller item subtotal (`1000 = 10%`); shipping and discounts are excluded from the commission base |
| Seller fulfilment | `PENDING→CONFIRMED|CANCELLED`, `CONFIRMED→PROCESSING|CANCELLED`, `PROCESSING→SHIPPED|CANCELLED`, `SHIPPED→OUT_FOR_DELIVERY|DELIVERED`, `OUT_FOR_DELIVERY→DELIVERED` |
| Parent aggregation | Only when every item belongs to a seller partition; cancelled partitions are ignored while remaining partitions progress, and mixed platform/seller orders stay admin-controlled |

### 7.5 Legacy SQLite schema (frozen)

Tables: `users`, `products`, `orders`, `order_items`, `reviews`, `wishlist`, `addresses`, `newsletter_subscribers`.
Notable divergence: dollar-denominated prices, session cookies, `is_admin` flag, and order totals that omit the tax/promotion figures shown in the legacy UI.

---

## 8. API Reference

Base path: `/api`. All responses follow `{ success: boolean, data?: T, error?: string, message?: string, pagination?: {...} }`.

### 8.1 Authentication — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/sign-up` | Public (5/min) | Create an account; password ≥ 8 chars with uppercase and digit |
| POST | `/sign-in` | Public (10/min) | Authenticate and receive a 7-day JWT |
| POST | `/forgot-password` | Public (3/min) | Neutral reset acknowledgement (delivery not implemented) |
| GET | `/me` | Bearer | Current user profile with order/review/wishlist counts |

### 8.2 Catalog — `/api/products`, `/api/categories`, `/api/brands`, `/api/collections`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products` | Public | Filter, sort, paginate |
| GET | `/products/featured` · `/trending` · `/new-arrivals` · `/deals` | Public | Merchandising rails |
| GET | `/products/:slug` | Public | Product detail with images, variants, specs |
| POST · PUT · DELETE | `/products` · `/products/:id` | Admin | Catalog management |
| GET | `/categories` · `/categories/:slug` | Public | Hierarchical categories |
| POST · PUT · DELETE | `/categories` | Admin | Category management |
| GET | `/brands` · `/brands/:slug` | Public | Brand listing/detail |
| POST · PUT · DELETE | `/brands` | Admin | Brand management |
| GET | `/collections` · `/collections/:slug` | Public | Curated collections |
| POST · DELETE | `/collections` · `/collections/:id/products` | Admin | Collection management |

### 8.3 Cart — `/api/cart` (authenticated)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Load or create the user's cart |
| POST | `/items` | Add an item (product + optional variant) |
| PUT | `/items/:itemId` | Update quantity |
| DELETE | `/items/:itemId` | Remove an item |
| DELETE | `/` | Clear the cart |
| POST | `/coupon` | Apply a coupon |
| DELETE | `/coupon` | Remove the applied coupon |

### 8.4 Orders — `/api/orders` (authenticated)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Paginated order history, optional status filter |
| GET | `/:orderId` | Order detail with items, payments, shipments, timeline |
| POST | `/` | Create an order from the cart (idempotent) |
| POST | `/:orderId/cancel` | Cancel a PENDING/CONFIRMED order and restock |

`POST /api/orders` success codes: `201` new order, `200` idempotent replay. Conflict codes: `409 INSUFFICIENT_STOCK`, `409 STOCK_RESERVATION_FAILED`, `409 PAYMENT_METHOD_UNAVAILABLE`, `409 ORDER_IN_PROGRESS`, `400` validation/coupon failures.

`POST /api/orders/:orderId/cancel` succeeds only while the order is `PENDING` or `CONFIRMED`; otherwise it returns `409 ORDER_NOT_CANCELLABLE`. The transition is atomic and restocks exactly once.

### 8.5 Payments — `/api/payments`

| Method | Path | Description |
|---|---|---|
| GET | `/methods` | Payment methods the server can fulfil (server-driven UI) |

Currently returned: `COD`, `BANK_TRANSFER`. `STRIPE` is added automatically when both a secret key and webhook secret are configured.

### 8.6 Customer account

| Method | Path | Description |
|---|---|---|
| GET · PUT | `/api/user/profile` | Read/update profile |
| GET | `/api/user/dashboard` | Aggregated account data |
| GET · POST · PUT · DELETE | `/api/addresses` | Address book with default selection |
| GET · POST · DELETE | `/api/wishlist` · `/toggle` · `/check/:productId` | Wishlist |
| GET · POST · DELETE | `/api/reviews` | Product reviews |
| GET · PUT · DELETE | `/api/notifications` | Notifications and read state |
| POST | `/api/newsletter` | Subscribe (5/min) |

### 8.7 Discovery

| Method | Path | Description |
|---|---|---|
| GET | `/api/search?q=` | Meilisearch-powered product search |
| GET | `/api/search/suggestions?q=` | Type-ahead suggestions |
| POST | `/api/coupons/validate` | Validate a coupon |
| POST | `/api/chat` | SSE streaming AI assistant |

### 8.8 Administration — `/api/admin` (admin role)

All routes require `ADMIN` or `SUPER_ADMIN`; authorization is enforced server-side.

| Method | Path | Description |
|---|---|---|
| GET | `/stats` | Revenue (cancelled excluded), counts, pending fulfilment, recent orders, low stock, 30-day daily revenue, seller/application counts, seller GMV and commission |
| GET | `/products` | Paginated/searchable admin product list with effective stock, moderation status and seller attribution |
| PUT | `/products/:id/moderation` | Approve/reject a seller listing; rejection requires a note and unpublishes the product |
| GET | `/orders` | Paginated/searchable order list with customer, items, payments, shipments and seller partitions |
| GET | `/orders/:id` | Full order detail including addresses, payments, shipments, status history and seller partitions |
| PUT | `/orders/:id` | Status transition (state machine), carrier/tracking on shipment, forced override + note, propagation to seller partitions |
| GET | `/sellers` | Paginated/searchable seller directory with product counts and sales/commission metrics |
| GET | `/sellers/applications` | Seller application queue with applicant, store and reviewer data |
| PUT | `/sellers/applications/:id/review` | Approve/reject an application; approval activates the store and owner membership |
| GET | `/sellers/:id` | Seller detail: memberships, applications, product counts, sales, commission and recent orders |
| PUT | `/sellers/:id/status` | Approve/suspend/reject/reinstate a seller; suspension removes listings from search |
| PUT | `/sellers/:id/commission` | Update commission basis points with an audit record |
| GET | `/users` | Paginated/searchable customer listing with role and order counts |
| PUT | `/users/:id/role` | Role change; rejects self-demotion and last-super-admin demotion |
| PUT | `/users/:id/toggle` | Activate/deactivate; rejects self-deactivation |

Order transitions: `PENDING→CONFIRMED|CANCELLED`, `CONFIRMED→PROCESSING|CANCELLED`, `PROCESSING→SHIPPED|CANCELLED`, `SHIPPED→OUT_FOR_DELIVERY|DELIVERED|RETURNED`, `OUT_FOR_DELIVERY→DELIVERED|RETURNED`, `DELIVERED→RETURNED|REFUNDED`, `RETURNED→REFUNDED`. Any other change requires `force: true` and a note. Conflict codes: `409 INVALID_TRANSITION`, `409 CONCURRENT_UPDATE`, `400 SAME_STATUS`, `400 NOTE_REQUIRED`.

### 8.9 Seller portal — `/api/seller` (authenticated seller membership)

Seller tenant scope is resolved from `SellerMembership`, not from the global `Role`. A user with multiple memberships selects one with the `x-seller-id` header; selecting an organization the user does not belong to returns `403 SELLER_ACCESS_DENIED`. Pending/suspended sellers can read their own context but cannot operate the store.

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/apply` | authenticated | Create organization + owner membership + application transactionally |
| GET | `/application` | authenticated | Latest application for the current user |
| GET | `/me` | authenticated | Active memberships and applications for the web shell |
| GET | `/context` | membership (unapproved allowed) | Selected seller context and status |
| GET | `/dashboard` | approved seller | Sales, commission, orders, product and fulfilment metrics from the seller's own data |
| GET | `/analytics` | `analytics:read:own` | 30-day revenue, status counts and best-selling products |
| GET | `/products` | `product:read:own` | Tenant-scoped product list with moderation filters |
| POST | `/products` | `product:create:own` | Create a draft listing pending moderation |
| PUT | `/products/:id` | `product:update:own` | Update own product; material changes return it to moderation |
| DELETE | `/products/:id` | `product:delete:own` | Archive if referenced by orders, otherwise delete |
| GET | `/orders` | `order:read:assigned` | Only seller partitions assigned to the selected organization |
| GET | `/orders/:id` | `order:read:assigned` | Own partition detail; cross-tenant IDs return `404` |
| PUT | `/orders/:id/status` | `order:fulfill:assigned` | Validated partition transition with shipment and restock handling |
| GET | `/storefront` | approved seller | Own storefront record |
| PUT | `/storefront` | `storefront:update:own` | Update public store identity and policies |

### 8.10 Public marketplace — `/api/sellers`

| Method | Path | Description |
|---|---|---|
| GET | `/` | Paginated approved-seller directory with moderated product counts |
| GET | `/:slug` | Approved storefront with its approved, active products; `404` otherwise |

### 8.11 Platform

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Readiness plus database/Redis connectivity (`503` when the database is down) |
| GET | `/api/health/live` | Process liveness only |
| GET | `/api/metrics` | Prometheus exposition |
| POST | `/api/webhooks/stripe` | Signed Stripe events (503 when unconfigured) |
| POST | `/api/webhooks/clerk` | Signed Clerk events (503 when unconfigured) |
| POST | `/api/upload` · `/api/upload/multiple` | Admin media upload to local disk; returns real `/uploads/*` URLs |

### 8.12 Legacy API (frozen) — `/api`

Mounted modules: `health`, `auth` (session-based: register/login/logout), `products`, `orders`, `chat`, `reviews`, `wishlist`, `addresses`, `user`, `admin`. The legacy API uses cookie sessions, not JWTs, and a different response/error convention.

---

## 9. Frontend Application

### 9.1 Route map (35 application routes; 36 pages generated including not-found)

**Storefront `(shop)`**

| Route | Purpose |
|---|---|
| `/` | Homepage: hero, categories, featured, deals, trending, newsletter |
| `/products` | Catalog with search, filters, sorting, pagination |
| `/product/[slug]` | Product detail: gallery, variants, specs, reviews, related items |
| `/cart` | Cart management and coupon entry |
| `/checkout` | Three-step shipping → payment → review |
| `/orders` | Order history, tracking and cancellation |
| `/account` | Profile, orders, wishlist, addresses |
| `/sellers` | Approved seller directory with search |
| `/sellers/[slug]` | Public seller storefront with moderated products |
| `/about`, `/contact`, `/help` | Informational pages |
| `/privacy`, `/terms`, `/returns`, `/shipping` | Policy pages |

**Authentication `(auth)`**

| Route | Purpose |
|---|---|
| `/sign-in` | Email/password sign-in |
| `/sign-up` | Registration with password rules |
| `/forgot-password` | Reset request UI |

**Administration `/admin`**

| Route | Purpose |
|---|---|
| `/admin` | Live dashboard: KPIs, 30-day revenue chart, recent orders, low stock |
| `/admin/products` | Product list/search/filter, create/edit dialog, image upload, archive/delete |
| `/admin/orders` | Order list/search/filter, full detail, status transitions, carrier/tracking, audit history |
| `/admin/customers` | Customer list/search/filter, inline role changes, activate/deactivate |
| `/admin/sellers` | Seller directory, application queue, approve/reject, suspend/reinstate, commission dialog |
| `/admin/moderation` | Seller listing moderation queue with approve/reject and notes |
| `/admin/categories` | Placeholder screen; category API exists but no management UI yet |
| `/admin/banners` | Placeholder screen; banner API exists but no management UI yet |
| `/admin/analytics` | Static shell; not yet wired to live metrics |
| `/admin/settings` | Static shell; not yet wired |

**Seller portal `/seller`**

| Route | Purpose |
|---|---|
| `/seller` | Seller dashboard: sales, commission, fulfilment queue, 14-day revenue |
| `/seller/products` | Tenant-scoped product list, create/edit, moderation status, archive/delete |
| `/seller/orders` | Assigned seller orders, detail, status transitions, carrier/tracking |
| `/seller/analytics` | 30-day revenue, order status counts, best-selling products |
| `/seller/storefront` | Public store identity and policy editor |
| `/seller/apply` | Seller application and status view |

### 9.2 Application shell

```
RootLayout
└── Providers
    ├── ThemeProvider (next-themes, class strategy)
    ├── ToastProvider
    ├── AuthProvider       (JWT in localStorage, /me refresh)
    ├── CartProvider       (local cart + server sync for signed-in users)
    └── WishlistProvider
        └── (shop) Layout
            ├── Header   (search, categories, cart, wishlist, account, theme)
            ├── Page content
            └── Footer

Admin shell (/admin)
└── AdminLayout
    ├── Auth guard (ADMIN / SUPER_ADMIN; loading skeleton + access-denied state)
    ├── Desktop sidebar / mobile sheet with active-route highlighting
    └── Page content (all data fetched from /api/admin/*)

Seller shell (/seller)
└── SellerLayout → SellerProvider
    ├── Auth guard + membership resolution (/api/seller/me)
    ├── Store switcher when the user belongs to multiple organizations
    ├── Status banner for pending/suspended stores
    └── Page content (all data fetched with x-seller-id from /api/seller/*)
```

### 9.3 State management

| Store | Persistence | Behaviour |
|---|---|---|
| Auth | `localStorage` (`ponnaloy_token`, `ponnaloy_user`) | Hydrates from storage, validates with `/api/auth/me`, clears on 401 |
| Cart | `localStorage` + server cart | Guest cart merges on sign-in; server is authoritative for signed-in users |
| Wishlist | Context + API | Optimistic toggling |
| Seller context | `localStorage` (`ponnaloy_seller_id`) | Memberships from `/api/seller/me`; selected store drives `x-seller-id` |
| Theme | `next-themes` | System default, class-based dark mode |
| Server data | Component-level `fetch` via `lib/api.ts`; React Query available | — |

### 9.4 Design system

| Token group | Definition |
|---|---|
| Colour model | HSL CSS variables consumed by Tailwind (`background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `info`, `border`, `input`, `ring`, `card`, `popover`) |
| Brand palette | `brand-50 … brand-950` teal scale |
| Typography | Inter via `next/font` (`--font-inter`), plus a display alias |
| Radius | `--radius`-derived scale from 2px to `calc(var(--radius) + 8px)` |
| Spacing | Extended quarter-rem and large scales |
| Motion | Accordion, slide, fade, scale and badge-pop keyframes |
| Components | Button (incl. `asChild`/`loading`), Input, Label, Textarea, Checkbox, RadioGroup, Select, Dialog, Sheet, Dropdown, Tabs, Accordion, Tooltip, Avatar, Badge, Card, Progress, Separator, Skeleton, Toast, StaggerGrid |
| Responsive | Mobile-first; container capped at 1400px |

### 9.5 Accessibility posture

Semantic landmarks, skip links on legacy pages, Radix primitives with keyboard support, focus-visible rings and ARIA state on async buttons. Admin tables expose labelled search/filter controls and icon buttons carry `aria-label`s; async actions show loading state. A formal WCAG 2.2 AA audit has **not** been performed.

---

## 10. Core Commerce Flows

### 10.1 Checkout (implemented)

```text
1. Client validates shipping fields and fetches GET /api/payments/methods.
2. On submit, client sends shipping/billing address, payment method,
   coupon code and a stable idempotency key.
3. API loads the cart and validates:
     • quantity is a positive integer ≤ 999
     • product status is ACTIVE
     • variant belongs to the product
     • requested quantity ≤ available stock
4. API recomputes subtotal, shipping, coupon discount and total from the database.
5. API claims the idempotency key (IdempotencyRecord).
     • existing order  → 200 replay
     • in-flight claim → 409 ORDER_IN_PROGRESS
6. API reserves each line atomically with a `stock >= qty` guard.
     • any failure → compensate previous decrements, release claim, 409
7. API creates the order, items, PENDING payment and status log.
8. API links the idempotency record, clears the cart, increments totalSold
   and coupon usage (failures logged, never silent).
9. Client clears local cart and routes to /orders?created=true.
```

### 10.2 Order cancellation and status changes

**Customer cancellation** is allowed only for `PENDING` or `CONFIRMED`. The API performs a conditional atomic update (`status IN (...) AND userId = caller`), restores variant or product stock, decrements `totalSold`, sets `restockedAt`, and writes a `CANCELLED` log with the actor. A second attempt returns `409 ORDER_NOT_CANCELLABLE`.

**Admin transitions** use an explicit state machine (see §8.8). Each transition is a conditional update guarded by the previously observed status, so two concurrent admins cannot both succeed; the loser receives `409 CONCURRENT_UPDATE`. MongoDB write conflicts are retried up to three times. Stock is returned exactly once, guarded by `restockedAt`, and shipment carrier/tracking are recorded when an order ships.

### 10.3 Authentication

```text
Register → scrypt hash (salt:hash) → user record
Sign in  → verify hash (timing-safe) → HS256 JWT (7 days) → localStorage
Request  → Authorization: Bearer <jwt> → signature + alg check → user lookup → isActive check
Admin    → role ∈ {ADMIN, SUPER_ADMIN}
```

Clerk tokens are accepted as a fallback path when Clerk is configured; the primary path is the custom JWT.

### 10.4 Cart synchronisation

Guest carts live in `localStorage`. After sign-in, the cart provider reconciles local items with the server cart and thereafter uses the API as the source of truth. The server cart stores product, optional variant, quantity and an optional applied coupon.

---

## 11. Security Model

### 11.1 Implemented controls

| Control | Detail |
|---|---|
| Password storage | scrypt with per-password salt; timing-safe comparison |
| Session token | HS256 JWT, 7-day expiry, algorithm pinned on verification |
| Secret management | Production refuses to start without a ≥32-character JWT secret; development uses an ephemeral random secret |
| Authorization | Route-level auth guards; admin role checks; per-user order ownership checks; deny-by-default RBAC permission catalogue; seller tenant scope resolved from `SellerMembership`; cross-tenant resources return `404` |
| Seller tenant isolation | Every seller query is scoped by the resolved `sellerId`; `x-seller-id` selection is validated against the user's active memberships |
| Product visibility | Public endpoints enforce active + moderated + approved-seller visibility server-side; client status filters cannot widen it |
| Audit trail | `OrderStatusLog`, `SellerOrderStatusLog` and `ActivityLog` capture actor/role for admin and seller transitions, moderation, approval and commission changes |
| Input validation | Zod schemas on write endpoints |
| SQL/NoSQL injection | Parameterised Prisma access; no string-concatenated queries |
| CORS | Explicit origin allow-list; preview wildcard opted in via `ALLOW_VERCEL_PREVIEWS` |
| Headers | Web: `X-Frame-Options: DENY`, `nosniff`, referrer policy, permissions policy and a baseline CSP (verified on the built server). API: Helmet |
| Content Security Policy | `default-src 'self'`, explicit script/style/img/connect/frame/worker origins, `object-src 'none'`, `frame-ancestors 'none'`; `unsafe-inline` remains until a nonce policy is added |
| Rate limiting | Global plus stricter auth/newsletter limits |
| Webhook integrity | Raw-body preservation plus signature verification |
| Payment data | No card data is stored; card payments are disabled until a compliant gateway flow exists |
| Secrets in repository | `.env` is git-ignored; this document exposes names only |

### 11.2 Open security items

| Severity | Item |
|---|---|
| **Critical (legacy)** | Stored/reflected XSS in legacy `frontend/public/js/*.js` through unescaped `innerHTML` |
| **High** | JWT stored in `localStorage` (XSS-exposed); httpOnly cookie + CSRF strategy is preferable |
| **Medium** | CSP still requires `'unsafe-inline'` for Next.js bootstrap scripts; nonce-based policy pending |
| **Medium** | Local uploads validate MIME/size and randomise filenames, but there is no malware scan or durable object storage |
| **Medium** | No email verification, so addresses are not proven |
| **Medium** | `forgot-password` performs no work |
| **Medium** | Seller payouts and a settlement ledger are not implemented; commission is accrued but not disbursed |
| **Low** | Seller `Role` exists globally, but authorization always uses `SellerMembership`; keep it that way when adding staff invitations |
| **Low** | `ActivityLog` covers seller/moderation/commission actions; some legacy admin mutations still lack broad audit coverage |

---

## 12. Configuration

### 12.1 Environment variables (names only)

| Variable | Consumed by | Purpose |
|---|---|---|
| `MONGODB_URI` | API | MongoDB connection string (**required**) |
| `PORT` | API / web | Listening port |
| `NODE_ENV` | Both | Environment mode |
| `FRONTEND_URL` | API | Comma-separated CORS allow-list |
| `BACKEND_URL` | API / web | API base URL for server-side callers |
| `NEXT_PUBLIC_API_URL` | Web | Public API base URL |
| `SESSION_SECRET` | Legacy | Session signing |
| `JWT_SECRET` (or `AUTH_SECRET`) | API | JWT signing — required in production, ≥32 chars |
| `REDIS_URL` | API | Cache connection |
| `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` | API | Search |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | API / web | Card payments (activates the Stripe method when both server keys exist) |
| `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | API / web | Optional identity provider |
| `OPENAI_API_KEY` | API | AI shopping assistant |
| `UPLOAD_DIR` | API | Local upload directory (default `uploads`, served at `/uploads/*`) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | API | Object storage (not wired) |
| `ALLOW_VERCEL_PREVIEWS` | API | Opt-in wildcard for preview deployment origins |

### 12.2 Port assignment

The active web app runs on port 3000 and the API on port 3001. `.env.example` and the API default now use `PORT=3001`. If a local `.env` still sets `PORT=3000` for the API, it will collide with the storefront — change it to 3001.

### 12.3 Required-before-deploy steps

```bash
pnpm --filter @ponnaloy/api db:generate   # regenerate Prisma Client
pnpm --filter @ponnaloy/api db:push       # apply additive schema (marketplace models,
                                          # Product.stock/sellerId/moderation*,
                                          # Order.idempotencyKey/restockedAt/sellerOrders,
                                          # OrderItem.sellerOrderId, Shipment.sellerOrderId,
                                          # OrderStatusLog.actorId/actorRole,
                                          # IdempotencyRecord, NewsletterSubscriber)
pnpm --filter @ponnaloy/api db:seed       # seed catalog + inventory
```

Existing, non-seeded products default to `stock = 0` after the schema change; they appear unavailable until inventory is assigned.

---

## 13. Local Development

### 13.1 Prerequisites

- Node.js ≥ 20
- pnpm 9.15
- MongoDB (replica-set capable) — required by the active API
- Optional: Docker for the MongoDB replica set, Redis and Meilisearch

### 13.2 Commands

| Command | Purpose |
|---|---|
| `pnpm install` | Install workspace dependencies |
| `pnpm dev` | Run storefront (3000) and API (3001) together via Turbo |
| `pnpm dev:web` / `pnpm dev:api` | Run one app |
| `pnpm dev:legacy` | Run the frozen legacy Express app |
| `pnpm build` | Turbo build for web + API |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm lint` | Lint all workspaces (flat configs) |
| `pnpm test` | Run the API Vitest suite (in-memory MongoDB replica set) |
| `pnpm db:generate` / `db:push` / `db:migrate` / `db:seed` / `db:studio` | Prisma lifecycle |
| `pnpm docker:up` / `docker:down` | Start/stop MongoDB replica set, Redis, Meilisearch |

### 13.3 Test harness

Integration tests use `MongoMemoryReplSet` and Fastify `inject`; they do not require a running database and do not run `prisma db push` inside the test process. Unit tests cover coupon and total maths. See §15.3.

### 13.4 Legacy application

- Static pages: `index.html`, `products.html`, `product.html`, `dashboard.html`, `orders.html`, `admin.html`.
- API base URL is generated into `frontend/public/js/env.js` by `frontend/build.js` or auto-detected on localhost.
- SQLite data lives in `data/store.db` (git-ignored).

---

## 14. Deployment

### 14.1 Storefront — Vercel

`apps/web/vercel.json`: Next.js framework, `pnpm install`, `pnpm build`, output `.next`.

### 14.2 API — Render

`render.yaml` defines a Node web service:

| Setting | Value |
|---|---|
| Name | `ponnaloy-api` |
| Build | `pnpm install --frozen-lockfile; pnpm --filter @ponnaloy/api build` |
| Start | `pnpm --filter @ponnaloy/api start` |
| Required secrets | `MONGODB_URI`, `SESSION_SECRET` (generated), `FRONTEND_URL`, `REDIS_URL` |

**Deployment caveat:** the API build script only runs `prisma generate`; `start` executes TypeScript directly through `tsx`. There is no compiled artefact, which increases cold-start time and memory use on small instances.

### 14.3 Supported services

| Service | Required | Degradation if absent |
|---|---|---|
| MongoDB | Yes | API cannot start |
| Redis | Optional | Cache disabled, warnings logged |
| Meilisearch | Optional | Search falls back to database filtering |
| Stripe | Optional | Card method hidden; COD/Bank Transfer available |
| OpenAI | Optional | Assistant returns an SSE error event |
| Object storage | Optional | Local disk uploads are used; R2/S3 adapter not yet wired |

---

## 15. Quality & Verification

### 15.1 Verification executed on 2026-10-27

| Check | Result | Detail |
|---|---|---|
| `pnpm typecheck` | **PASS** | 3/3 workspaces, 0 diagnostics |
| `pnpm lint` | **PASS** | 2/2 tasks, 0 errors (56 web warnings) |
| `pnpm --filter @ponnaloy/api test` | **PASS** | 3 files, 41/41 tests |
| Live order-flow E2E | **PASS** | 106/106 assertions over real HTTP against a single-node replica set: catalog (46 products), cart maths, coupon discount, checkout, idempotent replay, ownership isolation, cancellation, admin state machine, shipment tracking, return/refund, restock-once, insufficient-stock rejection |
| Marketplace API integration | **PASS** | 12 tests: onboarding approval, no-membership denial, cross-tenant selection denial, moderation visibility, legacy platform-product visibility, rejection notes, product ownership, staff delete denial, multi-vendor partitioning/allocation/commission, independent fulfilment and parent aggregation, suspension effects, commission audit and scoped metrics |
| `pnpm --filter @ponnaloy/web build` | **PASS** | Compiled; 36/36 pages generated |
| `pnpm --filter @ponnaloy/api db:generate` | **PASS** | Prisma Client generated from the marketplace schema |
| API runtime (in-memory replica set) | **PASS** | `tsx src/server.ts`; `/api/health` 200 with `database: connected`; payment methods `["COD","BANK_TRANSFER"]` |
| Security headers | **PASS** | Built Next.js server returned the full header set and CSP (inspected over HTTP) |
| API runtime (production database) | **PASS** | Atlas reachable; `db push` applied 7 collections + indexes; `/api/health` 200; `/api/products` returned 32 products; order detail intact |
| `docker compose up` | **NOT RUN** | Docker is not installed in this environment |
| Playwright smoke + axe | **FAIL** | 8/18 passed. Blocking findings: colour contrast (WCAG 1.4.3) and unnamed icon-only buttons; catalogue smoke blocked by CORS on the test port |
| Performance benchmarks | **NOT RUN** | Only build output observed (`/` = 167 kB first-load JS) |

### 15.2 Build evidence

```
Route (app)                                 Size  First Load JS
┌ ○ /                                    5.02 kB         167 kB
├ ○ /admin                               2.76 kB         119 kB
├ ○ /admin/moderation                    5.48 kB         154 kB
├ ○ /admin/sellers                       6.49 kB         151 kB
├ ○ /seller                              4.75 kB         121 kB
├ ○ /seller/orders                       7.32 kB         152 kB
├ ○ /seller/products                     8.07 kB         153 kB
├ ○ /sellers                             5.71 kB         124 kB
├ ƒ /sellers/[slug]                      4.32 kB         130 kB
├ ○ /checkout                            9.67 kB         137 kB
├ ○ /account                             10.6 kB         135 kB
├ ƒ /product/[slug]                      8.57 kB         176 kB
└ ... (36 pages total)
```

### 15.3 Test coverage implemented

| Layer | Tooling | Coverage |
|---|---|---|
| Unit | Vitest | 10 tests: coupon types, date/usage/minimum rules, clamping, shipping and total maths |
| API integration | Vitest + Fastify `inject` + `MongoMemoryReplSet` | 19 tests: auth, cart, checkout, idempotent replay, stock reservation/rollback, customer cancellation, admin authorization, admin pagination, product create/archive, full order lifecycle with tracking and single restock, concurrent admin cancellation, stats revenue/low stock, role guards |
| Marketplace integration | Vitest + Fastify `inject` + `MongoMemoryReplSet` | 11 tests: seller onboarding/approval, membership denial, tenant selection, moderation and visibility, rejection notes, product ownership, staff permissions, multi-vendor checkout allocation/commission, independent fulfilment and parent aggregation, suspension, commission audit and scoped metrics |
| E2E | Manual Node script over real HTTP | **PASS** — 106 assertions executed against a live API and replica set (catalog, cart, coupon, checkout, idempotency, cancellation, fulfilment, tracking, return/refund, restock-once, insufficient stock). The temporary harness was removed after the run |
| E2E (repeatable) | Playwright | **NOT RUN** — not installed |
| Non-functional | Lighthouse/axe | **NOT RUN** — not installed |

---

## 16. Risk Register

| ID | Risk | Severity | Impact | Mitigation / status |
|---|---|---|---|---|
| R1 | Prisma MongoDB transactions require a replica set; a standalone MongoDB cannot complete writes | High | Checkout and admin transitions fail | Docker compose and the test harness use replica sets; production Atlas must be a replica set. A PostgreSQL migration remains an option for heavier financial workloads |
| R2 | Production database had been unreachable | **Resolved** | No runtime verification against real data | Atlas SRV resolves; schema pushed additively; API booted against production data |
| R3 | API type errors | **Resolved** | Weak CI signal | `pnpm typecheck` now passes 3/3 |
| R4 | Automated coverage is partial | Medium | Regressions in untested paths | 41 unit/integration tests plus a 106-assertion live E2E run pass; Playwright smoke/axe executed and currently failing on real accessibility defects |
| R5 | No ESLint configuration | **Resolved** | Inconsistent code quality | Flat configs added for both apps; 0 errors |
| R6 | Admin UI renders mock data | **Resolved** | Operators may act on false information | Dashboard, products, orders, customers, sellers and moderation now use live API data |
| R7 | Legacy stored XSS | Critical (legacy only) | Account compromise on legacy deployment | Retire or patch the legacy frontend |
| R8 | Uploaded media durability | Medium | Broken media if disk is lost or multiple API instances run | Local disk driver works for single-instance deployments; R2/S3 adapter still required for scale |
| R9 | Password reset does not send email | Medium | Users cannot recover accounts | Token flow + email provider |
| R10 | API port collides with web port | **Resolved** | Local startup confusion | `.env.example` and API default use `PORT=3001` |
| R11 | Tracked build artefacts and logs | Low | Repository noise, secret-leak surface | `.gitignore` updated; historical artefacts still tracked |
| R12 | Three deployment descriptions disagree | Medium | Wrong service deployed | Consolidate documentation and configs |
| R13 | Tax constant is not applied to orders | Medium | Incorrect totals where tax is required | Implement tax calculation or remove the claim |
| R14 | JWT in localStorage | High | Token theft via XSS | Move to httpOnly cookies with CSRF protection |
| R15 | CSP allows inline scripts | Medium | Reduced XSS mitigation depth | Add nonce-based policy through Next.js middleware |
| R16 | Seller payouts and settlement ledger are absent | High | Sellers accrue commission but cannot be paid through the platform | Add a settlement ledger, payout states and reconciliation before operating commercially |
| R17 | Seller staff invitations are schema-only | Medium | Stores cannot safely add team members through the UI | Add invitation flow with role assignment and revocation |
| R18 | Search index and database can diverge after moderation/suspension | Medium | Stale search results | Moderation and seller-status routes remove/reindex affected products; a periodic reconciliation job is still recommended |

---

## 17. Roadmap

| Priority | Workstream | Scope | Exit criteria | Status |
|---|---|---|---|---|
| **P0** | Production runtime unblock | Reachable replica-set database, `db:push`, `db:seed`, API boot, manual checkout | Order created, stock decremented, cancel restocks | **Blocked** — local replica-set runtime verified; production host unreachable |
| **P0** | Verification harness | Vitest + Fastify inject; ESLint flat configs; Playwright smoke | CI green on typecheck, lint, tests | **Partial** — 40 tests, 106-assertion live E2E, lint and typecheck pass; Playwright and CI missing |
| **P0** | API type baseline | Resolve existing diagnostics | `pnpm typecheck` passes workspace-wide | **Done** |
| **P1** | Real admin | Replace mock arrays with `/api/admin/*` | Admin CRUD persists | **Done** for dashboard, products, orders, customers, sellers, moderation |
| **P1** | Seller marketplace foundation | Onboarding, tenant isolation, moderation, multi-vendor orders, commissions | Seller E2E + tenant isolation | **Done**; payouts, disputes and staff invitations remain |
| **P1** | Media storage | Validated uploads, MIME/size enforcement; durable object storage | Upload → serve round trip | **Partial** — local disk driver done; R2/S3 pending |
| **P1** | Account recovery | Reset tokens, expiry, single use, email delivery; email verification | Reset and verification E2E | **Planned** |
| **P1** | Payment gateway | Stripe Checkout Session + verified webhook + refunds | Test-mode card payment and refund | **Planned** |
| **P1** | Seller settlements | Commission ledger, payout states, reconciliation | Seller payout E2E | **Planned** |
| **P1** | Legacy retirement | Archive legacy stack, update README/scripts | One documented runtime | **Planned** |
| **P2** | CI/CD | GitHub Actions: install, typecheck, lint, test, build | Required checks on every PR | **Planned** |
| **P2** | PostgreSQL migration | Port schema, backfill, cutover, reconciliation | Transactional order integrity at scale | **Planned** |
| **P2** | Seller team management | Staff invitations, role assignment, revocation | Invite → accept → scoped access E2E | **Planned** |
| **P2** | B2B wholesale | Company accounts, MOQ, tier pricing, RFQ, quotes, approvals | RFQ → quote → order E2E | **Planned** |
| **P3** | Growth & intelligence | SEO/structured data, recommendations, campaigns, abandoned cart | Measured conversion uplift | **Planned** |
| **P3** | Internationalisation | Locale routing, currency, regional tax/shipping | Multi-region checkout | **Planned** |
| **P3** | Observability & DR | Tracing, alerting, backup/restore drills | Documented recovery objectives | **Planned** |

---

## 18. Conventions & Glossary

### 18.1 Conventions

| Area | Convention |
|---|---|
| Money | Integer cents, USD, formatted at the edge |
| IDs | MongoDB ObjectId strings |
| API shape | `{ success, data | error, pagination? }` |
| Errors | Human-readable `error`, machine-readable `code` for actionable conflicts |
| Auth | `Authorization: Bearer <jwt>` |
| Validation | Zod at the HTTP boundary |
| Naming | `PascalCase` components/types, `camelCase` functions/fields, `kebab-case` files |
| Imports | `@/` alias inside the web app; workspace package for shared code |
| Commits | Imperative, scoped summaries |

### 18.2 Glossary

| Term | Meaning |
|---|---|
| **B2C** | Business-to-consumer retail |
| **B2B** | Business-to-business wholesale |
| **RFQ** | Request for Quotation |
| **MOQ** | Minimum Order Quantity |
| **SKU** | Stock Keeping Unit |
| **Variant** | A purchasable configuration of a product (size, colour, etc.) |
| **Idempotency key** | Client-supplied token ensuring a retried request produces one result |
| **Reservation** | Temporary decrement of stock while an order is created |
| **Modular monolith** | Single deployable unit with strictly separated internal domains |
| **CWV** | Core Web Vitals |

---

## 19. Change Log

### Batch 01 — Checkout integrity, sellable inventory, honest payments

| Area | Change |
|---|---|
| Schema | Added `Product.stock`, `Order.idempotencyKey`, `IdempotencyRecord`, `NewsletterSubscriber` |
| Inventory | Product-level stock; variant-aware availability; seeded inventory |
| Orders | Server-recomputed totals; atomic conditional stock reservation with compensation; idempotent creation; coupon revalidation; cancellation restocks product-level inventory |
| Auth | Removed hardcoded JWT fallback; production secret enforcement; HS256 pinning; timing-safe comparisons |
| Payments | Server-driven method list; unsupported gateways rejected; no payment marked PROCESSING without a gateway |
| Webhooks | Raw-body content-type parser restores Stripe/Clerk signature verification; payment success confirms orders once |
| Platform | CORS wildcard opt-in; newsletter endpoint; feature flags derived from configuration |
| Storefront | Real payment options; idempotency key; country field; working newsletter; honest trust copy; variant-aware stock display |
| Build | Fixed Radix `Slot` crash that blocked `/account` prerender |

### Batch 02 — Tooling baseline, real uploads, shared pricing, runtime proof

| Area | Change |
|---|---|
| Type safety | Fixed all 12 API diagnostics; `pnpm typecheck` now passes 3/3 workspaces |
| API structure | `server.ts` exports `buildServer()`; tests boot the same instance as production |
| Health | Added `/api/health/live`; readiness returns `503` when the database is disconnected |
| Lint | ESLint flat configs for API and web; `pnpm lint` passes with warnings only |
| Uploads | Real local disk driver (`src/lib/storage.ts`): MIME/size validation, random filenames, `@fastify/static` at `/uploads/*`; placeholders removed |
| Pricing | `services/pricing.ts` centralises coupon evaluation and order totals for preview and checkout |
| Cancellation | Customer cancellation is a conditional atomic update; second attempt returns `409 ORDER_NOT_CANCELLABLE`; sets `restockedAt` |
| Tests | Vitest + `mongodb-memory-server`; 10 pricing unit tests + 19 API integration tests |
| Local environment | MongoDB replica-set `docker-compose.yml`; corrected `.env.example`; API `PORT=3001`; `pnpm dev` runs web + API, `pnpm dev:legacy` runs the old app |
| Runtime proof | API booted with `tsx` against an in-memory replica set; health `200`, database connected |

### Batch 03 — Real admin workspace, order state machine, audit trail

| Area | Change |
|---|---|
| Admin API | Safe numeric pagination; revenue excludes cancellations; 30-day daily revenue; low stock includes product-level stock; validated filters; `GET /admin/orders/:id` |
| Order lifecycle | Explicit transition map; conditional atomic updates; retry on Mongo write conflicts; forced overrides require a note; carrier/tracking capture; single restock guarded by `restockedAt` |
| Audit | `OrderStatusLog.actorId` / `actorRole`; customer cancellation logs its actor |
| User safety | Self-role-change and self-deactivation rejected; last active super admin cannot be demoted |
| Products | `stock` persisted on create; image set replaced on update; referenced products archived instead of deleted; unreferenced products removed with dependents |
| Validation | Real local `/uploads/*` media paths and internal links accepted; product `categoryId` nullable |
| Admin web | Role-guarded shell with loading/access-denied states; live dashboard, products, orders and customers screens; image upload; toasts; mobile-safe layout |
| Security | Baseline CSP added to the Next.js headers and verified on the built server |
| Verification | `pnpm typecheck` 3/3, `pnpm lint` 0 errors, 29/29 tests, 27/27 pages built |

### Batch 04 — Catalog depth and independently verified order flow

| Area | Change |
|---|---|
| Catalog | Seed expanded from 33 to 46 products across electronics, fashion, sports, home, beauty, books, toys and food; every new product has explicit stock, SKU, imagery and merchandising flags |
| Seed integrity | Removed two accidental duplicate slugs (matcha → hojicha, duplicate vitamin C → niacinamide moisturiser) so all 46 products are distinct and seed output matches database state |
| Order verification | 106 live HTTP assertions against a real MongoDB replica set: health, 46-product catalog, honest payment methods, role guards, coupon creation/application, cart totals, checkout, stock reservation, idempotent replay, order ownership isolation, customer cancellation, admin state machine, shipment carrier/tracking, delivery timestamps, return/refund, restock-once guards and server-authoritative insufficient-stock rejection |
| Fixes found | No product defects in the order system; two verification expectations were corrected (actual order-number format is `PNyymmdd-XXXXXX`; catalog totals only count `ACTIVE` products) |
| Verification | `pnpm typecheck` 3/3, `pnpm lint` 0 errors, 29/29 tests, 27/27 pages built, live E2E 106/106 |

### Batch 05 — Multi-vendor marketplace foundation

| Area | Change |
|---|---|
| Schema | Added `SellerOrganization`, `SellerMembership`, `SellerApplication`, `SellerOrder`, `SellerOrderStatusLog`, `ModerationStatus`, `SellerStatus`, `SellerMemberRole`, `SellerApplicationStatus`; added `Product.sellerId` / `moderationStatus` / `moderationNote`, `Order.sellerOrders`, `OrderItem.sellerOrderId`, `Shipment.sellerOrderId`; `Role` gains `SELLER`. 36 models, 13 enums |
| Authorization | New permission catalogue (`resource:action:scope`) with deny-by-default role and staff permission sets; `requireSellerMembership` / `requireSeller` / `requireSellerPermission` guards; tenant scope resolved from `SellerMembership`, not the global role |
| Tenant isolation | Every seller query scoped by the resolved `sellerId`; multi-organization selection via validated `x-seller-id`; cross-tenant IDs return `404`; only `APPROVED` stores can operate |
| Onboarding | `POST /api/seller/apply` creates organization + owner membership + application transactionally; admin review queue approves/rejects with reviewer notes |
| Catalogue moderation | Seller-created/edited listings start `DRAFT` + `PENDING`; admin approve/reject endpoint with mandatory rejection note; public catalogue and search require `ACTIVE` + `APPROVED` + approved seller |
| Multi-vendor checkout | Cart grouped by seller; atomic parent order plus `SellerOrder` partitions; shipping and discount allocated proportionally with exact cent reconciliation; commission stored in basis points on the seller subtotal |
| Fulfilment | Independent seller partition state machine with carrier/tracking and per-partition restock guard; parent status aggregated only when every item belongs to a partition; customer cancellation blocked once fulfilment starts (`ORDER_FULFILMENT_STARTED`) |
| Admin | Seller directory, application queue, status transitions (suspend/reinstate), commission updates, seller GMV/commission metrics, moderation queue; suspension removes listings from Meilisearch and reinstatement reindexes them |
| Public marketplace | Approved-seller directory and storefront pages; seller attribution on product detail |
| Seller portal | Dashboard, products, orders, analytics and storefront editor wired to tenant-scoped API data with store switcher and status banner |
| Reliability | Exhausted Mongo write conflicts now return `409 CONCURRENT_UPDATE` instead of `500` |
| Tests | 12 marketplace integration tests (onboarding, isolation, moderation, legacy-product visibility, staff permissions, multi-vendor allocation, independent fulfilment, suspension, commission audit, scoped metrics); suite total 41/41 |
| Verification | `pnpm typecheck` 3/3, `pnpm lint` 0 errors, 41/41 tests, 36/36 pages built |
| Production database | DNS now resolves; `prisma db push` created 7 marketplace collections and their indexes on Atlas without data loss (32 products, 2 orders intact); API booted against it and served 32 public products |
| Regression found and fixed | Public visibility used `sellerId: null`, which does not match MongoDB documents where the field is absent; the production catalogue returned 0 products until `isSet: false` was added. Covered by a new integration test |
| Browser / accessibility | Playwright + axe installed and executed against the production build: **8/18 passed**. Real defects found: colour-contrast failures and icon-only buttons without accessible names. Catalogue smoke test blocked by CORS on the test port |

### Verification

- Workspace type check: **PASS** — `pnpm typecheck`, 3/3 workspaces, 0 diagnostics.
- Lint: **PASS** — `pnpm lint`, 0 errors (warnings only).
- API tests: **PASS** — 3 files, 41/41 tests (10 pricing unit + 19 commerce integration + 12 marketplace integration) against an in-memory MongoDB replica set.
- Storefront production build: **PASS** — 36/36 pages generated.
- Live order-flow E2E over real HTTP: **PASS** — 106/106 assertions, including checkout, cancellation, fulfilment, tracking, return/refund and restock-once.
- Marketplace API integration: **PASS** — onboarding/approval, membership denial, cross-tenant denial, moderation visibility, legacy platform-product visibility, product ownership, staff permissions, multi-vendor partitioning and commission, independent fulfilment and parent aggregation, suspension effects, commission audit, scoped metrics.
- API runtime against an in-memory MongoDB replica set: **PASS** — health `200`, database connected, payment methods `COD`/`BANK_TRANSFER`.
- Seeded catalog: **PASS** — 8 categories, 10 brands, 46 distinct products.
- Production MongoDB runtime: **PASS** — Atlas SRV resolved; `prisma db push` created the marketplace collections/indexes; API booted with `database: connected` and served 32 legacy products.
- Docker Compose: **NOT RUN** — Docker is not installed in this environment.
- Playwright / axe: **FAIL** — installed and executed (Chromium + Pixel 7 profiles). 8/18 passed; 10 failed on colour contrast and icon-button accessible names. The catalogue smoke test also failed because the API CORS allow-list does not include the Playwright port. These are genuine findings, not harness noise, except for the CORS configuration.
- Performance benchmarks: **NOT RUN** — only build output observed.
- Seller payouts, settlement ledger, staff invitations and dispute management: **NOT IMPLEMENTED**.
- Card payments and transactional email: **BLOCKED** — no gateway keys or SMTP provider configured.
- Production deployment: **BLOCKED** — no hosting credentials.
- No production-ready claim is made: deployment, card payments, email delivery and WCAG AA conformance remain unverified or failing.

---

*This document describes the repository as inspected and modified on 2026-10-27. It deliberately separates verified behaviour from partial and planned work, and it contains no credentials or personal data.*

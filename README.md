<h1 align="center">Ponnaloy</h1>

<p align="center">
  A multi-vendor e-commerce platform: Next.js storefront, Fastify API, MongoDB, and
  server-enforced customer, seller and administrator portals.
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="#repository-layout">Repository Layout</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#scripts">Scripts</a> &bull;
  <a href="#verification-status">Verification Status</a>
</p>

---

## Features

### Storefront
- Product catalogue with search, category filters, sorting and pagination
- Product detail pages with variants, specifications, reviews and seller attribution
- Cart with optimistic updates, coupons and guest-to-account merge
- Checkout with server-validated prices, stock and totals
- Cash on delivery, bank transfer and optional Stripe card payments
- Order history and tracking, wishlist, saved addresses, password reset
- Approved-seller directory and public seller storefronts
- AI shopping assistant (OpenAI when configured, local matching otherwise)

### Seller portal
- Seller application and onboarding
- Tenant-scoped dashboard, product CRUD, orders and analytics
- Storefront editor
- Listings start `DRAFT` + `PENDING` and go live only after admin approval

### Administration
- Dashboard and analytics
- Product, category, brand, banner and order management
- Seller applications, suspension and commission rates
- Catalogue moderation queue
- Customer management and role assignment
- Stripe refunds for collected card payments

### Platform
- JWT authentication with password-change invalidation
- Role- and attribute-based authorization; seller scope from `SellerMembership`
- Idempotent Stripe webhooks (`PaymentEvent.eventId` unique)
- Redis cache with fail-fast fallback to a bounded in-process cache
- Meilisearch indexing with database filtering fallback
- Prometheus metrics, Pino logging, rate limiting, helmet/CSP, compression

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm 9 workspaces + Turborepo |
| Storefront | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Radix UI |
| API | Fastify 5, TypeScript, Zod validation |
| Database | MongoDB via Prisma 6 |
| Cache | Redis (optional; in-process fallback) |
| Search | Meilisearch (optional; database fallback) |
| Payments | Stripe Checkout + webhooks (optional), COD, bank transfer |
| Auth | Custom JWT, optional Clerk |
| Email | SMTP via nodemailer, JSON capture when unconfigured |
| Tests | Vitest + Supertest-style HTTP tests, Playwright + axe |

---

## Repository Layout

```
ponnaloy-e-com/
├── apps/
│   ├── api/                    # Fastify API
│   │   ├── prisma/schema.prisma
│   │   ├── scripts/            # seed-seller-catalog.ts
│   │   ├── src/
│   │   │   ├── config/         # validated environment
│   │   │   ├── lib/            # prisma, redis, stripe, email, search, auth cache
│   │   │   ├── middleware/     # auth, seller scope, errors
│   │   │   ├── routes/         # auth, products, cart, orders, seller, admin, ...
│   │   │   └── server.ts
│   │   └── test/
│   └── web/                    # Next.js storefront + seller/admin workspaces
│       ├── src/app/
│       ├── src/components/
│       ├── src/contexts/
│       └── e2e/                # Playwright + axe
├── packages/shared/            # shared types, constants, pricing helpers
├── docker-compose.yml          # local MongoDB replica set, Redis, Meilisearch
├── render.yaml                 # API deployment descriptor
├── pnpm-workspace.yaml
└── turbo.json
```

The former Express/SQLite application (`backend/`, `frontend/`, `server.js`,
`data/`) was removed. `apps/web` + `apps/api` + `packages/shared` are the only
runtime.

---

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm 9.15 (`corepack enable`)
- MongoDB replica set (local Docker or Atlas)
- Optional: Redis, Meilisearch, Stripe, SMTP

### Installation

```bash
pnpm install
cp .env.example .env
```

Fill in `.env` at the repository root and `apps/api/.env`. The API validates
required variables at boot and refuses to start in production without a strong
`JWT_SECRET`.

Minimum local configuration:

```env
# apps/api/.env
MONGODB_URI=mongodb://localhost:27017/ponnaloy?replicaSet=rs0
PORT=3001
NODE_ENV=development
JWT_SECRET=replace-with-a-long-random-string
FRONTEND_URL=http://localhost:3000
REDIS_ENABLED=false          # set true when Redis is running
```

```env
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Database and seed data

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed                 # base catalogue and reference data
pnpm db:seed:seller          # demo seller + in-stock catalogue (idempotent)
```

`db:seed:seller` creates `Ponnaloy Home Studio` (owner
`seller@ponnaloy.local` / `PonnaloySeller#2026`) with 13 active products and
restocks any legacy platform product that has no inventory.

### Run

```bash
pnpm dev                     # web on :3000, API on :3001
```

Optional services:

```bash
pnpm docker:up               # MongoDB replica set, Redis, Meilisearch
pnpm docker:down
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run storefront and API together via Turbo |
| `pnpm dev:web` / `pnpm dev:api` | Run one app |
| `pnpm build` | Build web + API |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm lint` | Lint all workspaces |
| `pnpm test` | API Vitest suite (in-memory MongoDB replica set) |
| `pnpm db:generate` / `db:push` / `db:migrate` / `db:seed` / `db:studio` | Prisma lifecycle |
| `pnpm db:seed:seller` | Seed the demo seller catalogue and restock legacy products |
| `pnpm docker:up` / `docker:down` | Local MongoDB, Redis, Meilisearch |
| `pnpm --filter @ponnaloy/web e2e` | Playwright + axe suite |

---

## Verification Status

Verified in this repository (2026-10-29):

- Workspace type check: **PASS** (3/3 workspaces)
- Lint: **PASS** (0 errors; warnings remain)
- API tests: **PASS** (54/54)
- Storefront production build: **PASS** (37/37 pages)
- Playwright + axe: **PASS** (18/18, desktop + Pixel 7)
- Production MongoDB: reachable, schema applied, 45 in-stock products

Not verified / blocked:

- Real Stripe card capture: **BLOCKED** (no Stripe keys)
- External email delivery: **BLOCKED** (no SMTP provider)
- Docker Compose: **BLOCKED** (Docker not installed)
- Production deployment: **BLOCKED** (no hosting credentials)
- Redis/Meilisearch in this runtime: **NOT TESTED** (fallbacks active)

No production-ready claim is made. See `PROJECT_DETAILS.md` for the full
evidence log and risk register.

---

## License

MIT &copy; 2025 Ponnaloy

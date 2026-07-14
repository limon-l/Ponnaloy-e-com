<p align="center">
  <img src="frontend/public/favicon.svg" alt="Ponnaloy" width="80" />
</p>

<h1 align="center">Ponnaloy</h1>

<p align="center">
  A full-stack e-commerce platform with a dark glassmorphism UI, AI-powered shopping assistant, and admin dashboard.<br/>
  Built with Express.js, SQLite, and vanilla JavaScript.
</p>

<p align="center">
  <a href="#live-demo">Live Demo</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#deployment">Deployment</a> &bull;
  <a href="#api-reference">API</a> &bull;
  <a href="#license">License</a>
</p>

---

## Live Demo

| | URL |
|---|---|
| **Frontend** | [ponnaloy.vercel.app](https://ponnaloy.vercel.app) |
| **Backend API** | [ponnaloy-api.onrender.com](https://ponnaloy-api.onrender.com) |

> Update these links after deployment.

---

## Features

### Customer-Facing
- **Product Catalog** — 500 seeded products across 10 categories with search, sort, and filter
- **Product Detail Pages** — Image zoom, quantity stepper, related products, and review system
- **Shopping Cart** — localStorage-based drawer with promo code support (WELCOME10, FREESHIP, VIP20)
- **Checkout Flow** — Auth-gated checkout with shipping address, phone, and payment method selection
- **Order History** — Filterable, searchable order list with expandable detail cards and status badges
- **User Dashboard** — Profile management, password change, saved addresses, wishlist, and order summary
- **AI Shopping Assistant** — Chat widget with OpenAI integration (falls back to local product-matching logic)
- **Wishlist** — localStorage-based with server-side persistence per user account
- **Newsletter** — Email subscription with server-side storage
- **Recently Viewed** — Product history tracked in localStorage

### Admin
- **Dashboard Overview** — Revenue, order count, user count, product count, recent activity, and low-stock alerts
- **Product Management** — Full CRUD with image URL, category, stock, pricing, and featured flag
- **Order Management** — View all orders, update status (placed &rarr; confirmed &rarr; shipped &rarr; delivered), and detail modal
- **User Management** — List all users with role badges, order count, and join date

### UX / UI
- **Dark Glassmorphism Theme** — Custom color palette with glass-effect panels and gradient accents
- **GSAP Animations** — Page entrance, modal transitions, auth form shake, and cart drawer slide
- **AOS Scroll Reveals** — Intersection Observer-based staggered reveal animations
- **Responsive Design** — Mobile-first layout with horizontal-scroll nav on small screens
- **Toast Notifications** — Non-intrusive feedback for all user actions
- **Confetti Celebration** — Fires on successful order placement
- **Animated Counters** — Stats animate on scroll into view
- **Parallax Effects** — Subtle depth on scroll for hero sections

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js &ge; 18 |
| **Server** | Express.js 4 |
| **Database** | SQLite3 (via `sqlite3` npm package) |
| **Session Store** | `connect-sqlite3` (SQLite-backed session persistence) |
| **Auth** | Session-based with `bcryptjs` password hashing |
| **Security** | Helmet.js, express-rate-limit, cookie-parser |
| **AI** | OpenAI API (optional, falls back to local product matching) |
| **Frontend** | Vanilla HTML / CSS / JavaScript |
| **Styling** | Tailwind CSS 3 (custom theme, minified build) |
| **Animations** | GSAP 3, AOS (Animate On Scroll) |
| **Icons** | Inline SVG (no icon library dependency) |
| **Fonts** | Space Grotesk (display), Manrope (body) via Google Fonts |

---

## Project Structure

```
ponnaloy-e-com/
├── server.js                   # Entry point (loads env + starts backend)
├── package.json
├── tailwind.config.js          # Custom theme (colors, fonts, radii)
├── vercel.json                 # Vercel deployment config
├── render.yaml                 # Render deployment config
├── .env.example                # Required environment variables
│
├── backend/
│   ├── server.js               # Express app, middleware, routes, CORS
│   ├── config/env.js           # Environment variable loader
│   ├── db.js                   # SQLite schema, seed data, query functions
│   ├── middleware/
│   │   ├── asyncHandler.js     # Async route wrapper
│   │   ├── errorHandler.js     # Global error handler
│   │   └── requireAuth.js      # Session auth guard
│   ├── routes/
│   │   ├── auth.js             # Login, register, logout, session check
│   │   ├── products.js         # Product listing, search, detail
│   │   ├── orders.js           # Order CRUD (auth required)
│   │   ├── admin.js            # Admin dashboard API (admin required)
│   │   ├── reviews.js          # Product reviews
│   │   ├── wishlist.js         # User wishlist
│   │   ├── addresses.js        # Saved addresses
│   │   ├── user.js             # Profile and password management
│   │   ├── chat.js             # AI shopping assistant
│   │   └── health.js           # Health check endpoint
│   └── utils/sanitize.js       # User object sanitizer
│
└── frontend/
    └── public/
        ├── index.html          # Homepage
        ├── products.html       # Product catalog
        ├── product.html        # Product detail
        ├── dashboard.html      # User dashboard
        ├── orders.html         # Order history
        ├── admin.html          # Admin panel
        ├── input.css           # Tailwind source (directives + components)
        ├── styles.css          # Compiled Tailwind output (minified)
        ├── favicon.svg
        └── js/
            ├── env.js          # API URL auto-detection / injection
            ├── shared.js       # API helper, product cards, toasts, user menu
            ├── state.js        # Shared global state object
            ├── cart.js         # localStorage cart, promo codes, order submit
            ├── app.js          # Homepage logic, category filters, checkout
            ├── auth.js         # Login/register modal with GSAP
            ├── products.js     # Catalog page
            ├── product.js      # Product detail + reviews
            ├── dashboard.js    # Dashboard tabs (profile, orders, wishlist, addresses)
            ├── orders.js       # Order history page
            ├── admin.js        # Admin panel logic
            └── assistant.js    # AI chat widget
```

---

## Getting Started

### Prerequisites

- **Node.js** &ge; 18
- **npm** &ge; 9

### Installation

```bash
git clone https://github.com/your-username/ponnaloy-e-com.git
cd ponnaloy-e-com
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-random-secret-string
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=sk-...          # optional
```

### Build CSS

```bash
npm run build:css
```

### Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Default Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@ponnaloy.com | admin123 |
| **Customer** | Register at `/` | — |

---

## Deployment

### Frontend &rarr; Vercel

1. Push to GitHub
2. Import repository on [vercel.com/new](https://vercel.com/new)
3. Set environment variable:
   - `PONNALOY_API_URL` = `https://your-backend.onrender.com/api`
4. Deploy — Vercel runs `npm run build && node frontend/build.js` automatically

> The `env.js` file is generated at build time with your backend URL. For local development, it auto-detects `localhost:3000`.

### Backend &rarr; Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Build Command:** `npm install && npm run build:css`
   - **Start Command:** `node server.js`
   - **Health Check Path:** `/api/health`
4. Set environment variables:
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = (generate a random string)
   - `FRONTEND_URL` = `https://your-frontend.vercel.app`
   - `OPENAI_API_KEY` = (optional)
5. Add a **Persistent Disk** mounted at `/opt/render/project/src/data` (1 GB) for SQLite

> On first boot, the server auto-creates the SQLite database and seeds 500 products.

---

## API Reference

All endpoints are prefixed with `/api`.

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Server health check |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth/me` | No | Get current session user (or `null`) |
| POST | `/api/auth/register` | No | Create account (`name`, `email`, `password`) |
| POST | `/api/auth/login` | No | Sign in (`email`, `password`) |
| POST | `/api/auth/logout` | No | Destroy session |
| POST | `/api/auth/signout` | No | Alias for logout |

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | No | List all products (`?q`, `?category`, `?featured`) |
| GET | `/api/products/trending` | No | Top-rated products |
| GET | `/api/products/deals` | No | Products with discount |
| GET | `/api/products/categories` | No | List all categories |
| GET | `/api/products/:id` | No | Single product detail |

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/orders` | Yes | List user's orders |
| GET | `/api/orders/:orderId` | Yes | Single order detail |
| POST | `/api/orders` | Yes | Create order (`items`, `shippingAddress`, `phone`, `email`) |

### Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reviews/product/:productId` | No | List reviews + stats for a product |
| POST | `/api/reviews` | Yes | Submit review (`productId`, `rating`, `title`, `comment`) |
| DELETE | `/api/reviews/:reviewId` | Yes | Delete own review |

### User

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/profile` | Yes | Get profile |
| PUT | `/api/user/profile` | Yes | Update profile (`name`, `email`, `phone`) |
| PUT | `/api/user/password` | Yes | Change password (`currentPassword`, `newPassword`) |

### Wishlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wishlist` | Yes | List wishlist items |
| POST | `/api/wishlist/toggle` | Yes | Toggle product in wishlist (`productId`) |

### Addresses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/addresses` | Yes | List saved addresses |
| POST | `/api/addresses` | Yes | Add address |
| PUT | `/api/addresses/:id` | Yes | Update address |
| DELETE | `/api/addresses/:id` | Yes | Delete address |

### Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat` | No | Send message to AI assistant (`message`) |

### Newsletter

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/newsletter` | No | Subscribe (`email`) |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | Admin | Dashboard stats |
| GET | `/api/admin/products` | Admin | All products |
| POST | `/api/admin/products` | Admin | Create product |
| PUT | `/api/admin/products/:id` | Admin | Update product |
| DELETE | `/api/admin/products/:id` | Admin | Delete product |
| GET | `/api/admin/orders` | Admin | All orders |
| PUT | `/api/admin/orders/:id/status` | Admin | Update order status |
| GET | `/api/admin/users` | Admin | All users |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `SESSION_SECRET` | **Yes** | — | Secret for signing session cookies |
| `FRONTEND_URL` | **Yes** | `http://localhost:3000` | CORS allowed origin (your Vercel URL) |
| `OPENAI_API_KEY` | No | `null` | OpenAI API key for AI assistant |

---

## License

MIT &copy; 2025 Ponnaloy

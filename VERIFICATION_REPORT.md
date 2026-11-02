# Application audit — 2026-11-01

## Changes

- Added root `.env` credentials and `pnpm db:seed:accounts`. Created the missing super administrator and demo customer in the configured MongoDB database. Preserved the existing seller account. Verified all three passwords and successful HTTP sign-ins; passwords themselves are stored only in the ignored `.env` file.
- Fixed the admin customer list crashing on `SELLER` accounts; added seller role filtering and selection.
- Fixed optimistic cart additions matching server items by product and variant instead of incompatible local/server IDs.
- Enforced product stock and cumulative variant stock for cart additions and quantity updates.
- Applied public product visibility checks when adding products to carts.
- Recalculated coupon discounts from current cart contents and eligibility; cleared invalid coupons. Reused checkout coupon evaluation for start dates, caps and free shipping.
- Refreshed cart totals after quantity changes and removals; preserved zero-priced variants and removed empty-cart shipping charges.
- Invalidated the category tree cache after category create, update and delete.

## Verification

- API integration/unit suite: 57 passing tests across five files. Covers authentication, checkout pricing, inventory, coupons, order lifecycle, concurrency, seller isolation, catalogue moderation, payments authorization, SMTP, and administration. Added regressions for cumulative cart stock, quantity changes, coupon recalculation, empty-cart totals and seller account filtering.
- API, web and shared TypeScript checks passed.
- Next.js production build passed: 37 pages. Lint has no errors; existing warnings remain.
- Desktop Chrome and Pixel 7 storefront smoke/accessibility suite: 18 passing tests.
- Additional cart/wishlist browser regression: 2 passing tests (desktop and mobile), checking addition, quantity increase/decrease, persistence after reload and item removal. Total: 20 browser tests passed.
- Live API: all three account sign-ins returned 200. Six role-specific reads per account returned 200, including admin stats/users/products/orders/categories/banners; customer profile/dashboard/cart/orders/addresses/wishlist; seller membership/dashboard/analytics/products/orders/storefront.
- Authenticated browser checks: 15 pages rendered with no uncaught client errors or blank body: six admin pages, four customer pages and five seller pages. These are rendering checks, not proof that every mutation on each page works.
- Used an isolated in-memory MongoDB replica set for integration mutations; live checks did not place orders, charge cards or delete existing catalogue records.

## Remaining gaps

- Admin Categories, Banners, Analytics and Settings still display “Coming Soon”. Category/banner APIs exist, but their management interfaces are unfinished.
- Wishlist UI uses browser local storage; it is not synchronized with the authenticated wishlist API, so database wishlist counts can differ from the UI and saved items do not follow users across devices.
- Guest coupon entry records a code without validating it; authoritative validation occurs at checkout. Cart action success notifications can appear before a rejected server mutation is reconciled.
- Cart optimistic mutations are not serialized; rapid overlapping requests still warrant dedicated concurrency coverage in the browser.
- Real Stripe capture/refunds, external email delivery, Redis and Meilisearch were not exercised with real provider credentials/services. Local database search fallback was active.
- Every button, state permutation and CRUD operation has not been individually exercised in a browser. Passing suites do not make those unfinished portions complete.
- The installed pnpm launcher could not verify/download the pinned pnpm version in this environment. Checks ran through the installed local Node CLI entry points instead.

Credentials are in the repository root `.env`. Editing those values does not reset existing account passwords; the bootstrap deliberately preserves existing accounts.

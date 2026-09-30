# appdev — BCP Uniform Guide (uniguide)

AI body-scan sizing, live stock and transparent pricing for BCP school uniforms.

The app is being moved from a static prototype to a production architecture:

```
client/     React 18 + Vite + TypeScript SPA (the app)
server/     Express API (auth, catalogue, sizing recommendations, stock, orders)
prototype/  Legacy static prototype — kept as a reference only
```

## Running locally

Requirements: Node.js 18+ and PostgreSQL 14+ (16 is what the setup used).

```bash
# 0. Database (once)
psql -U postgres -c "CREATE DATABASE uniguide;"
cp server/.env.example server/.env   # then adjust JWT secrets / credentials

# 1. API  → http://localhost:5000
cd server
npm install
npm run dev

# 2. Web  → http://localhost:5173  (proxies /api to the API)
cd client
npm install
npm run dev
```

The API creates tables at boot while `DB_SYNC=true`, seeds the catalogue from
`server/data/initialData.js` (11 uniforms / 60 sizes) on first run, and seeds the
admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (existing passwords are never
overwritten).

## Scripts

| Where  | Command             | What it does                                            |
| ------ | ------------------- | ------------------------------------------------------- |
| client | `npm run dev`       | Vite dev server with `/api` proxy                        |
| client | `npm run typecheck` | TypeScript, no emit                                      |
| client | `npm run build`     | Typecheck + production build to `client/dist`            |
| client | `npm run smoke`     | Playwright end-to-end smoke (sizing, photo scan, catalog, auth, cart, checkout, payment, admin) |
| server | `npm run dev`       | API with auto-reload                                     |
| server | `npm run check:auth` | Auth/roles acceptance gate (20 checks)                  |
| server | `npm run check:orders` | Checkout/orders acceptance gate (21 checks)          |
| server | `npm run check:payments` | Payments acceptance gate (41 checks: sessions, webhook signatures, sandbox) |
| server | `npm run check:scan` | Photo-scan acceptance gate (23 checks: validation, determinism, pipeline) |
| server | `npm run check:parity` | Asserts the API sizing algorithm still matches the legacy prototype's |
| server | `npm run reset:stock` | Restores catalogue stock to the seed values (test runs place real orders) |

## API

| Method | Path                              | Purpose                                            |
| ------ | --------------------------------- | -------------------------------------------------- |
| GET    | `/api/uniforms`                   | All uniforms, `?gender=`, `?category=`, `?search=`  |
| POST   | `/api/uniforms/recommendations`   | Size recommendations from measurements              |
| POST   | `/api/uniforms/scan`              | Extract measurements from a photo (rate limited; `simulated` flag says whether numbers are real) |
| PATCH  | `/api/uniforms/stock`             | Update a size's stock — `{sizeId,newStock}` (**admin only**) |
| POST   | `/api/orders`                     | Checkout: validates + reserves stock in a transaction (auth) |
| GET    | `/api/orders`                     | Own order history; admins may pass `?scope=all`      |
| GET    | `/api/orders/:id`                 | One order (owner or admin; others get 404)           |
| PATCH  | `/api/orders/:id/status`          | Set `pending/paid/ready/completed/cancelled` (**admin only**; cancelling restores stock) |
| POST   | `/api/payments/checkout`          | Create (or reuse) a checkout session for an online order (auth) |
| GET    | `/api/payments/:orderId`          | Latest payment for polling (owner or admin)            |
| POST   | `/api/payments/sandbox/confirm`   | Simulate the gateway redirect-back (**owner only**; test gateway) |
| POST   | `/api/payments/webhook`           | Gateway callback — `Paymongo-Signature` verified over the raw body |
| POST   | `/api/auth/register`              | Create a student account (rate limited)             |
| POST   | `/api/auth/login`                 | Email or student ID + password → access token       |
| POST   | `/api/auth/refresh`               | httpOnly refresh cookie → new access token           |
| POST   | `/api/auth/logout`                | Revokes every outstanding refresh token              |
| GET    | `/api/auth/me`                    | Current user (requires `Authorization: Bearer`)      |
| GET    | `/health`                         | Health check                                        |

Auth model: 15-minute access token in memory on the client, 7-day refresh token
in an httpOnly cookie scoped to `/api/auth`, `tokenVersion` on the user row for
revocation, bcrypt (12 rounds), 30 credential attempts / 15 min / IP.

Orders: the cart lives client-side (localStorage, `bcpCart`); checkout sends the
whole cart to the server, which prices it from the database, reserves the stock
under row locks and stores line-item snapshots, so history survives catalogue
edits. Orders start as `pending` with `paymentMethod` set to `cash_on_pickup`
(admin marks them paid manually) or `online` (PayMongo checkout → `paid`).

Payments (Phase 4): `server/payments/` isolates the gateway behind a provider
registry — set `PAYMONGO_SECRET_KEY` and the real PayMongo Hosted Checkout is
used (`POST /v2/checkout_sessions`, success/cancel return URLs,
`checkout_session.payment.paid` webhook); without keys the built-in sandbox
serves an in-app test gateway at `/checkout/sandbox` so the whole flow stays
testable offline. Webhook deliveries are verified against the raw request body
(HMAC-SHA256, `t=…,v1=…` and bare-hex schemes both accepted, timing-safe
compare), deduplicated on the event id in a ledger table, guarded against
livemode mismatches, and settled through the same pipeline the sandbox uses.
`PAYMONGO_WEBHOOK_SECRET` must hold the endpoint secret you register in the
PayMongo dashboard; see `server/.env.example` for every knob. Note: cancelling
a paid order restores stock but does not issue a refund (no refund flow yet).

Sizing: `POST /api/uniforms/scan` takes a base64 photo (JPEG/PNG/WebP — MIME
whitelist, base64 hygiene, magic-byte and `SCAN_MAX_BYTES` size checks, 60
requests/IP/15 min) and returns measurements through the provider registry in
`server/scanning/`. Today `SCAN_PROVIDER=auto` resolves to the sandbox, which
derives **deterministic** measurements from the image hash plus gender (same
photo → same numbers) and flags them `simulated: true`; the UI shows that as a
"Simulated scan" badge. Wiring a real AI provider later is one file behind the
same interface: add `gemini.js`/`openai.js` with an API-key env var, register
it in `scanning/index.js`, and both `auto` and the badge flip automatically.

## Status

Production plan phases:

- [x] **Phase 1** — React port of the student app (home, body scan, catalog, themes) on top of the API
- [x] **Phase 2** — Auth & roles: registration/login/refresh/logout, bcrypt, JWT, rate limiting, admin middleware, guarded routes, profile menu
- [x] **Phase 3** — Catalogue in PostgreSQL, cart, checkout, order history, admin panel (inventory + order workflow)
- [x] **Phase 4** — Payments: cash on pickup or online via PayMongo Hosted Checkout (sandbox gateway fallback), signed webhooks, payment history in orders/admin
- [x] **Phase 5** — Photo-scan sizing: server-side scan endpoint with a provider seam, validation, determinism, rate limiting *(sandbox provider for now — a real vision API plugs into `server/scanning/` when a key is available)*
- [ ] Phase 5 — Real photo-scan AI sizing (currently simulated)
- [ ] Phase 6 — Test coverage, security hardening, performance
- [ ] Phase 0/7 — Sequelize migrations (tables are created with `DB_SYNC` today), Docker/CI deployment

Still to port from `prototype/admin.html`: the dashboard charts, bulk pricing
updates, settings toggles and the theme customizer (the React admin panel at
`/admin` currently covers inventory and orders). Not implemented anywhere yet:
profile editing (`PATCH /auth/me`) and creating/editing catalogue items from
the admin UI.

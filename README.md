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

The API creates tables at boot while `DB_SYNC=true` (a dev shortcut) or, as in
production, via `npm run migrate` — the Sequelize migrations in
`server/migrations/` create the same schema from scratch. It seeds the catalogue
from `server/data/initialData.js` (11 uniforms / 60 sizes) on first run, and seeds
the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (existing passwords are
never overwritten).

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
| server | `npm run check:security` | Security gate (49 checks: env fail-fasts, headers, authz/IDOR, CORS, limiter trip-proof) |
| server | `npm run check:parity` | Asserts the API sizing algorithm still matches the legacy prototype's |
| server | `npm run check:migrations` | Migration gate (18 checks: fresh DB → migrate → boot with `DB_SYNC=false` → every table + static SPA) |
| server | `npm run migrate`          | Applies Sequelize migrations (`migrate:status` / `migrate:undo` also available) |
| server | `npm run reset:stock` | Restores catalogue stock to the seed values and cancels leftover pending orders (test runs place real orders) |

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
revocation, bcrypt (12 rounds), HS256 pinned on verify, a password policy
(min 8 chars, letter + number) and a timing-equalized login (an unknown account
does the same bcrypt work as a wrong password).

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

Security (Phase 6): every layer is rate limited per IP (global 2000/15 min on
`/api`, credentials 150/15 min, scans 60/15 min, checkout 100/h — in-memory, so
one process per instance), helmet sets the headers, `X-Powered-By` is off, and
CORS only reflects an allow-list. Behind a reverse proxy set `TRUST_PROXY=1`
so limits see real client IPs. Production **fails fast on boot** until
`JWT_SECRET`/`JWT_REFRESH_SECRET` are set and distinct, `TRUST_PROXY` and
`CLIENT_ORIGINS` are explicit, and the default `ADMIN_PASSWORD` is gone.
Authorization is enforced with owner-or-admin checks (other users get 404, not
403, so IDs can't be probed), register strips injected `role`, and JWTs reject
`alg=none`/wrong-algorithm tokens. `npm run check:security` proves all of it,
including booting a throwaway server to show each limiter actually 429ing.

## Deployment (Phase 7)

Schema changes ship as Sequelize migrations in `server/migrations/`
(`npm run migrate`, `migrate:status`, `migrate:undo`). The initial migration is
idempotent — it creates only missing tables — so it is safe on a `DB_SYNC`
development database and mandatory on fresh ones. Production runs with
`DB_SYNC=false`; `npm run check:migrations` proves a scratch database can be
migrated, booted and used end to end without any sync. In production the API also
serves the built client from `client/dist` (SPA fallback included, `/api` stays on
JSON), so one origin serves the whole app.

**Docker** (API + Postgres, SPA served by the API):

```bash
docker compose up --build        # http://localhost:5000
```

Migrations run at container start; the production env fail-fasts refuse to boot
until real values are provided, so override `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`ADMIN_PASSWORD` (and later `PAYMONGO_*`) in a root `.env` before exposing
anything beyond localhost. Behind nginx/Cloudflare set `TRUST_PROXY=1` and point
`CLIENT_ORIGINS` / `PUBLIC_URL` at your domain.

**PM2** (bare-metal/VPS alternative):

```bash
npm --prefix server run migrate
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

One instance on purpose — rate-limit counters are in-process. **CI**: every push
runs `.github/workflows/ci.yml` — typecheck, client build, all seven server gates
against a Postgres service, then the Playwright smoke test.

## Status

Production plan phases:

- [x] **Phase 1** — React port of the student app (home, body scan, catalog, themes) on top of the API
- [x] **Phase 2** — Auth & roles: registration/login/refresh/logout, bcrypt, JWT, rate limiting, admin middleware, guarded routes, profile menu
- [x] **Phase 3** — Catalogue in PostgreSQL, cart, checkout, order history, admin panel (inventory + order workflow)
- [x] **Phase 4** — Payments: cash on pickup or online via PayMongo Hosted Checkout (sandbox gateway fallback), signed webhooks, payment history in orders/admin
- [x] **Phase 5** — Photo-scan sizing: server-side scan endpoint with a provider seam, validation, determinism, rate limiting *(sandbox provider for now — a real vision API plugs into `server/scanning/` when a key is available)*
- [x] **Phase 6** — Tests & security: `check:security` gate (env fail-fasts, headers, authz/IDOR, CORS, limiter trip-proof), layered rate limits, production boot requirements, password policy, timing-equalized login, honest `reset:stock`
- [x] **Phase 7** — Deploy: Sequelize migrations (+ `check:migrations` gate, `DB_SYNC` optional), Docker/compose, PM2, GitHub Actions CI, static SPA serving

Still to port from `prototype/admin.html`: the dashboard charts, bulk pricing
updates, settings toggles and the theme customizer (the React admin panel at
`/admin` currently covers inventory and orders). Not implemented anywhere yet:
profile editing (`PATCH /auth/me`) and creating/editing catalogue items from
the admin UI.

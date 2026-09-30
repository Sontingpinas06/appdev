# appdev — BCP Uniform Guide (uniguide)

AI body-scan sizing, live stock and transparent pricing for BCP school uniforms.

The app is being moved from a static prototype to a production architecture:

```
client/     React 18 + Vite + TypeScript SPA (the app)
server/     Express API (uniforms, sizing recommendations, stock)
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

The API creates tables at boot while `DB_SYNC=true` and seeds the admin account
from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (existing passwords are never overwritten).

## Scripts

| Where  | Command             | What it does                                            |
| ------ | ------------------- | ------------------------------------------------------- |
| client | `npm run dev`       | Vite dev server with `/api` proxy                        |
| client | `npm run typecheck` | TypeScript, no emit                                      |
| client | `npm run build`     | Typecheck + production build to `client/dist`            |
| client | `npm run smoke`     | Playwright end-to-end smoke (sizing, catalog, auth, themes) |
| server | `npm run dev`       | API with auto-reload                                     |
| server | `npm run check:auth` | Auth/roles acceptance gate (20 checks)                  |
| server | `npm run check:parity` | Asserts the API sizing algorithm still matches the legacy prototype's |

## API

| Method | Path                              | Purpose                                            |
| ------ | --------------------------------- | -------------------------------------------------- |
| GET    | `/api/uniforms`                   | All uniforms, `?gender=`, `?category=`, `?search=`  |
| POST   | `/api/uniforms/recommendations`   | Size recommendations from measurements              |
| PATCH  | `/api/uniforms/stock`             | Update stock (**admin only**)                       |
| POST   | `/api/auth/register`              | Create a student account (rate limited)             |
| POST   | `/api/auth/login`                 | Email or student ID + password → access token       |
| POST   | `/api/auth/refresh`               | httpOnly refresh cookie → new access token           |
| POST   | `/api/auth/logout`                | Revokes every outstanding refresh token              |
| GET    | `/api/auth/me`                    | Current user (requires `Authorization: Bearer`)      |
| GET    | `/health`                         | Health check                                        |

Auth model: 15-minute access token in memory on the client, 7-day refresh token
in an httpOnly cookie scoped to `/api/auth`, `tokenVersion` on the user row for
revocation, bcrypt (12 rounds), 30 credential attempts / 15 min / IP.

## Status

Production plan phases:

- [x] **Phase 1** — React port of the student app (home, body scan, catalog, themes) on top of the API
- [x] **Phase 2** — Auth & roles: registration/login/refresh/logout, bcrypt, JWT, rate limiting, admin middleware, guarded routes, profile menu
- [ ] Phase 3 — Cart, orders, checkout, admin inventory
- [ ] Phase 4 — Payments
- [ ] Phase 5 — Real photo-scan AI sizing (currently simulated)
- [ ] Phase 6 — Test coverage, security hardening, performance
- [ ] Phase 0/7 — Sequelize migrations (tables are created with `DB_SYNC` today), Docker/CI deployment

Not ported yet: `prototype/admin.html` (admin panel UI) — see the placeholder at
`/admin`, which is now behind the admin role check. Profile editing (`PATCH
/auth/me`) is not implemented.

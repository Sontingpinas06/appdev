# appdev — BCP Uniform Guide (uniguide)

AI body-scan sizing, live stock and transparent pricing for BCP school uniforms.

The app is being moved from a static prototype to a production architecture:

```
client/     React 18 + Vite + TypeScript SPA (the app)
server/     Express API (uniforms, sizing recommendations, stock)
prototype/  Legacy static prototype — kept as a reference only
```

## Running locally

Requirements: Node.js 18+.

```bash
# 1. API  → http://localhost:5000
cd server
npm install
npm run dev

# 2. Web  → http://localhost:5173  (proxies /api to the API)
cd client
npm install
npm run dev
```

Copy `server/.env.example` to `server/.env` if you need to change the port or
allowed origins.

## Scripts

| Where  | Command             | What it does                                            |
| ------ | ------------------- | ------------------------------------------------------- |
| client | `npm run dev`       | Vite dev server with `/api` proxy                        |
| client | `npm run typecheck` | TypeScript, no emit                                      |
| client | `npm run build`     | Typecheck + production build to `client/dist`            |
| client | `npm run smoke`     | Playwright smoke test against the dev server (system Chrome) |
| server | `npm run dev`       | API with auto-reload                                    |
| server | `npm run check:parity` | Asserts the API sizing algorithm still matches the legacy prototype's |

## API

| Method | Path                              | Purpose                                            |
| ------ | --------------------------------- | -------------------------------------------------- |
| GET    | `/api/uniforms`                   | All uniforms, `?gender=`, `?category=`, `?search=`  |
| POST   | `/api/uniforms/recommendations`   | Size recommendations from measurements              |
| PATCH  | `/api/uniforms/stock`             | Update stock (admin — not yet protected)            |
| GET    | `/health`                         | Health check                                        |

## Status

Production plan phases:

- [x] **Phase 1** — React port of the student app (home, body scan, catalog, themes) on top of the API
- [ ] Phase 2 — Auth & roles (JWT, bcrypt, admin middleware)
- [ ] Phase 3 — Cart, orders, checkout, admin inventory
- [ ] Phase 4 — Payments
- [ ] Phase 5 — Real photo-scan AI sizing (currently simulated)
- [ ] Phase 6 — Test coverage, security hardening, performance
- [ ] Phase 0/7 — PostgreSQL + Sequelize migrations, Docker/CI deployment

Not ported yet: `prototype/admin.html` (admin panel) and `prototype/login.html`
(auth) — see the placeholders at `/admin` and `/login`.

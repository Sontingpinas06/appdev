# Multi-stage build: compile the React client, then package it with the API so
# one container serves the whole app (static SPA + /api on the same origin).
#
#   docker compose up --build     (see docker-compose.yml)
#   docker build -t uniguide .

# --- client ---------------------------------------------------------------
FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- server ---------------------------------------------------------------
FROM node:22-alpine AS server
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
# sequelize-cli is a runtime dependency: migrations run at container start.
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client /app/client/dist /app/client/dist

EXPOSE 5000
# DB_SYNC is false in production, so the migration owns the schema. The
# production env fail-fasts (JWT/TRUST_PROXY/CLIENT_ORIGINS/ADMIN_PASSWORD)
# refuse to boot until compose (or your orchestrator) provides real values.
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node index.js"]

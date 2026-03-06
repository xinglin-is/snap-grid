# ─────────────────────────────────────────────────────────────────────────────
# Snap-Grid — Dockerfile for Railway
# Single container: Socket.io API + Vite React SPA on one port
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# ── Install all workspace deps ────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/
RUN pnpm install --frozen-lockfile

# ── Copy all source ───────────────────────────────────────────────────────────
FROM deps AS source
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
COPY packages/client ./packages/client

# ── Build client (vite alias resolves shared/src directly) ───────────────────
FROM source AS build-client
RUN pnpm --filter @snap-grid/client build

# ── Build shared (needed at runtime by server) ────────────────────────────────
FROM source AS build-shared
RUN pnpm --filter @snap-grid/shared build

# ── Build server (tsc paths resolve shared/src directly, no .d.ts needed) ────
FROM source AS build-server
RUN pnpm --filter @snap-grid/server build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:22-alpine AS production
RUN npm install -g pnpm
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
RUN pnpm install --prod --filter @snap-grid/server...

# Shared compiled output (required at runtime by server)
COPY --from=build-shared /app/packages/shared/dist ./packages/shared/dist
# Server compiled output
COPY --from=build-server /app/packages/server/dist ./packages/server/dist
# Client built SPA
COPY --from=build-client /app/packages/client/dist ./packages/client/dist

EXPOSE 3001
ENV NODE_ENV=production

# main field in server package.json points to dist/server/src/index.js
CMD ["node", "packages/server/dist/server/src/index.js"]

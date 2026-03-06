# ─────────────────────────────────────────────────────────────────────────────
# Snap-Grid — Dockerfile for Railway
# Single container: serves both the Socket.io API and the Vite-built React app
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/
RUN pnpm install --frozen-lockfile

# ── Build shared ──────────────────────────────────────────────────────────────
FROM deps AS build-shared
COPY packages/shared ./packages/shared
RUN pnpm --filter @snap-grid/shared build

# ── Build client ──────────────────────────────────────────────────────────────
FROM build-shared AS build-client
COPY packages/client ./packages/client
RUN pnpm --filter @snap-grid/client build

# ── Build server ──────────────────────────────────────────────────────────────
FROM build-client AS build-server
COPY packages/server ./packages/server
RUN pnpm --filter @snap-grid/server build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:22-alpine AS production
RUN npm install -g pnpm
WORKDIR /app

# Copy only what's needed to run
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Install production deps only
RUN pnpm install --prod --filter @snap-grid/server

# Copy compiled outputs
COPY --from=build-server /app/packages/shared/dist ./packages/shared/dist
COPY --from=build-server /app/packages/server/dist ./packages/server/dist
COPY --from=build-client /app/packages/client/dist ./packages/client/dist

# Expose port (Railway sets $PORT automatically)
EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "packages/server/dist/index.js"]

# 🚀 Railway Deploy — Snap-Grid

## Prerequisites
- [Railway account](https://railway.app) (free tier works)
- [Railway CLI](https://docs.railway.com/cli) or GitHub connection

---

## Option A — GitHub (Recommended, auto-deploys on push)

### Step 1: Create a GitHub repo
```bash
cd /workspace/snap-grid-app
git init -b main
git add -A
git commit -m "feat: Snap-Grid MVP"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/snap-grid.git
git push -u origin main
```

### Step 2: Connect to Railway
1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo**
3. Choose `snap-grid`
4. Railway auto-detects the `Dockerfile` ✓

### Step 3: Set environment variable
In Railway dashboard → your service → **Variables**:
```
NODE_ENV = production
```
> Railway auto-sets `PORT`. No other env vars needed.

### Step 4: Add a public domain
Railway dashboard → your service → **Settings** → **Networking** → **Generate Domain**

Your game will be live at something like:
```
https://snap-grid-production.up.railway.app
```

---

## Option B — Railway CLI (direct upload)

```bash
cd /workspace/snap-grid-app

# Login (opens browser)
railway login

# Create project
railway init --name "snap-grid"

# Set env var
railway variables set NODE_ENV=production

# Deploy (Railway builds the Dockerfile)
railway up

# Get public URL
railway domain
```

---

## What Railway Builds (Dockerfile stages)

```
Stage 1: deps        — pnpm install (all workspaces)
Stage 2: build-shared — tsc → packages/shared/dist/
Stage 3: build-client — vite build → packages/client/dist/
Stage 4: build-server — tsc → packages/server/dist/
Stage 5: production  — node:22-alpine, prod deps only, ~80MB image
```

## What Gets Served

| Route | Handler |
|-------|---------|
| `GET /` | React SPA (index.html) |
| `GET /room/:code` | React SPA (SPA fallback) |
| `GET /health` | `{"status":"ok","timestamp":...}` |
| `WS /socket.io` | Socket.io game engine |

---

## Estimated Free Tier Capacity
- ~50MB RAM per idle server
- Railway Hobby: $5/mo, supports ~100 concurrent rooms easily
- Starter (free): 500 hours/month — enough for testing

---

## Post-Deploy Checklist
- [ ] Visit `https://your-domain.up.railway.app` — see Snap-Grid lobby
- [ ] Open in two browser tabs, create + join a room
- [ ] Place cards, hit READY on both — resolution fires
- [ ] Share URL with a friend for real async test

---

## Troubleshooting

**WebSocket not connecting:**
- Railway supports WebSocket natively — no extra config needed
- Ensure `/socket.io` path is not blocked by a proxy

**Build fails:**
- Check Railway build logs: `railway logs --build`
- Common fix: ensure `pnpm-lock.yaml` is committed (it is ✓)

**Port issues:**
- Railway sets `$PORT` automatically — server listens on `0.0.0.0:$PORT` ✓

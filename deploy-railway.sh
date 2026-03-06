#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-railway.sh — One-shot Railway deploy for Snap-Grid
# Run from: /workspace/snap-grid-app/
# Requires: RAILWAY_TOKEN env var OR interactive browser login
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "🃏 Snap-Grid — Railway Deploy Script"
echo "────────────────────────────────────"

# 1. Check Railway CLI
if ! command -v railway &>/dev/null; then
  echo "Installing Railway CLI..."
  npm install -g @railway/cli
fi

echo "Railway CLI: $(railway --version)"

# 2. Auth check
if [ -z "$RAILWAY_TOKEN" ]; then
  echo ""
  echo "No RAILWAY_TOKEN found — opening browser login..."
  railway login
else
  echo "Using RAILWAY_TOKEN from environment ✓"
fi

# 3. Init or link project
if [ ! -f ".railway/config.json" ]; then
  echo ""
  echo "Creating new Railway project..."
  railway init --name "snap-grid"
else
  echo "Linked to existing Railway project ✓"
fi

# 4. Set required environment variables
echo ""
echo "Setting environment variables..."
railway variables set NODE_ENV=production

# 5. Build locally before upload (faster than Railway build for monorepos)
echo ""
echo "Building packages..."
pnpm --filter @snap-grid/shared build
pnpm --filter @snap-grid/client build
pnpm --filter @snap-grid/server build

# 6. Deploy
echo ""
echo "Deploying to Railway..."
railway up --detach

# 7. Get public URL
echo ""
echo "Fetching deployment URL..."
sleep 5
railway domain || echo "Run 'railway domain' to get/set your public URL"

echo ""
echo "✅ Deploy triggered! Monitor at: https://railway.app/dashboard"
echo "   Logs: railway logs --tail"
echo "   URL:  railway open"

#!/usr/bin/env bash
# Pulls the latest code and restarts Veraim with no data loss.
#   bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."
if ! grep -qs "^DATABASE_URL=\"postgres" .env; then
  echo "Veraim isn't installed yet (no .env with DATABASE_URL). Run first:  DOMAIN=veraim.xyz bash deploy/install.sh"
  exit 1
fi
git pull
npm ci --no-audit --no-fund
npx prisma migrate deploy
npm run --silent seed   # keeps the official agents (names, instructions) up to date
npm run build
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
echo "Updated."

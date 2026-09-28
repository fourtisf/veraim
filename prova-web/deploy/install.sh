#!/usr/bin/env bash
# Veraim: one-time setup on a fresh Ubuntu VPS (run as root, from the prova-web folder):
#   bash deploy/install.sh
# Safe to run again: it skips what is already done and keeps an existing .env.
set -euo pipefail
cd "$(dirname "$0")/.."

DOMAIN="${DOMAIN:-veraim.xyz}"
PORT=3100
say()  { printf "\n\033[1;32m==> %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m!!  %s\033[0m\n" "$*"; }

# ask VAR "question" [secret] — skipped if VAR is already set (or NONINTERACTIVE=1)
ask() {
  local var=$1 q=$2 secret=${3:-} val=""
  if [ -n "${!var:-}" ] || [ -n "${NONINTERACTIVE:-}" ]; then return 0; fi
  if [ -n "$secret" ]; then read -rsp "$q: " val; echo; else read -rp "$q: " val; fi
  printf -v "$var" '%s' "$val"
}

# setenv KEY VALUE — writes KEY="VALUE" into .env (replacing an existing line)
setenv() {
  node -e '
    const fs = require("fs"); const [k, v] = process.argv.slice(1);
    let s = fs.readFileSync(".env", "utf8"); const re = new RegExp("^" + k + "=.*$", "m");
    const line = k + "=\"" + v + "\"";
    s = re.test(s) ? s.replace(re, line) : s.trimEnd() + "\n" + line + "\n";
    fs.writeFileSync(".env", s);' "$1" "$2"
}

[ "$(id -u)" = 0 ] || { echo "Please run as root (sudo -i first)."; exit 1; }

say "1/8 Installing system packages (Node.js 20, PostgreSQL, Nginx, Certbot, PM2)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx postgresql certbot python3-certbot-nginx openssl ca-certificates
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2
(systemctl enable --now postgresql nginx 2>/dev/null) || service postgresql start

say "2/8 Installing the app's packages"
npm ci --no-audit --no-fund

if [ ! -f .env ]; then
  say "3/8 Creating the settings file (.env)"
  DB_PASS=$(openssl rand -hex 24)
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='veraim'" | grep -q 1; then
    sudo -u postgres psql -qc "ALTER USER veraim WITH PASSWORD '$DB_PASS';"
  else
    sudo -u postgres psql -qc "CREATE USER veraim WITH PASSWORD '$DB_PASS';"
  fi
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='veraim'" | grep -q 1 || sudo -u postgres psql -qc "CREATE DATABASE veraim OWNER veraim;"

  echo "Answer a few questions (press Enter to skip the optional ones; you can edit .env later)."
  ask ADMIN_WALLET "Your wallet address, for the /admin page (0x...)"
  ask TREASURY_ADDRESS "Treasury wallet that receives Veraim's 10% (Enter = same as above)"
  ask ANTHROPIC_API_KEY "Anthropic API key (sk-ant-..., runs the official agents)" secret
  ask OPENROUTER_API_KEY "OpenRouter API key (optional)" secret
  ask TELEGRAM_BOT_TOKEN "Telegram bot token from @BotFather (optional)" secret
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then ask TELEGRAM_BOT_USERNAME "Telegram bot username, without @"; fi

  cp .env.example .env
  chmod 600 .env
  setenv DATABASE_URL "postgresql://veraim:${DB_PASS}@localhost:5432/veraim?schema=public"
  setenv NEXT_PUBLIC_SITE_URL "https://${DOMAIN}"
  setenv SESSION_SECRET "$(openssl rand -hex 32)"
  setenv ADMIN_WALLETS "${ADMIN_WALLET:-}"
  setenv TREASURY_ADDRESS "${TREASURY_ADDRESS:-${ADMIN_WALLET:-}}"
  setenv ANTHROPIC_API_KEY "${ANTHROPIC_API_KEY:-}"
  setenv OPENROUTER_API_KEY "${OPENROUTER_API_KEY:-}"
  setenv TELEGRAM_BOT_TOKEN "${TELEGRAM_BOT_TOKEN:-}"
  setenv TELEGRAM_BOT_USERNAME "${TELEGRAM_BOT_USERNAME:-}"
  setenv CHAIN "robinhood"
  # A fresh wallet used only for sealing calls onchain (it pays gas).
  SEALER_KEY=$(node -e 'console.log(require("viem/accounts").generatePrivateKey())')
  setenv SEALER_PRIVATE_KEY "$SEALER_KEY"
else
  say "3/8 Keeping the existing .env"
fi

SEALER_ADDR=$(node -e 'require("dotenv").config(); const k=process.env.SEALER_PRIVATE_KEY; console.log(k ? require("viem/accounts").privateKeyToAccount(k).address : "")')

say "4/8 Setting up the database"
npx prisma migrate deploy
npm run seed

say "5/8 Building the website (takes 1-2 minutes)"
npm run build

say "6/8 Starting the website and the worker with PM2"
if ss -ltn 2>/dev/null | grep -q ":$PORT " && ! pm2 describe veraim-web >/dev/null 2>&1; then
  warn "Port $PORT is already used by another program. Change 3100 in ecosystem.config.js and deploy/nginx.conf, then run this again."
  exit 1
fi
pm2 startOrReload ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || warn "Could not enable PM2 on reboot automatically; run: pm2 startup"

say "7/8 Connecting ${DOMAIN} with Nginx"
sed "s/veraim\.xyz/${DOMAIN}/g" deploy/nginx.conf > /etc/nginx/sites-available/veraim
ln -sf /etc/nginx/sites-available/veraim /etc/nginx/sites-enabled/veraim
if ! nginx -t 2>/dev/null; then
  # servers without IPv6: drop the IPv6 listen line and try again
  sed -i '/listen \[::\]:80;/d' /etc/nginx/sites-available/veraim
  nginx -t
fi
(systemctl reload nginx 2>/dev/null) || nginx -s reload 2>/dev/null || nginx
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow OpenSSH >/dev/null; ufw allow "Nginx Full" >/dev/null
fi

say "8/8 HTTPS certificate"
if [ -n "${SKIP_SSL:-}" ]; then
  warn "Skipped (SKIP_SSL set)."
else
  ask SSL_EMAIL "Email for the SSL certificate (renewal notices)"
  if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "${SSL_EMAIL:-admin@$DOMAIN}" --redirect; then
    echo "HTTPS is on."
  else
    warn "Certbot failed. Usually the DNS isn't pointing here yet. Wait a bit, then run:"
    warn "  certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect"
  fi
fi

cat <<EOF

────────────────────────────────────────────────────────────
 Veraim is running.  Open: https://${DOMAIN}

 NEXT STEP (onchain seals and paid runs):
   1. Send about 0.01 ETH on Robinhood Chain to the sealer wallet:
        ${SEALER_ADDR}
   2. Then run:   bash deploy/contracts.sh

 Settings file: $(pwd)/.env   (keep a private backup of it)
 Logs:          pm2 logs veraim-web   /   pm2 logs veraim-worker
 Update later:  bash deploy/update.sh
────────────────────────────────────────────────────────────
EOF

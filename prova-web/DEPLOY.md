# Deploying Veraim to the Hostinger VPS

This guide puts Veraim live on your domain with HTTPS: the website, the database, the worker that seals and grades calls, and the contract on Robinhood Chain. Copy and paste each command in order. Lines that start with `#` are notes, so don't paste those.

Wherever you see `veraim.xyz`, use your real domain instead.

---

## Quick deploy (recommended)

One script does everything below for you: installs the software, creates the database and settings file, builds the site, starts it with PM2, connects the domain with Nginx and turns on HTTPS.

**Before you start:** point your domain at the VPS. In the domain's DNS, add an `A` record for `@` with the VPS IP, and a `CNAME` for `www` pointing to your domain.

Log in to the VPS (`ssh root@YOUR_VPS_IP`) and run:

```bash
apt-get update && apt-get install -y git
git clone -b claude/new-session-hs7nrs https://github.com/fourtisf/prova.git /var/www/veraim
cd /var/www/veraim/prova-web
DOMAIN=veraim.xyz bash deploy/install.sh
```

If the repository is private, `git clone` asks for your GitHub username and a **personal access token** as the password (GitHub → Settings → Developer settings → Personal access tokens).

The script asks for:
- your wallet address (for `/admin`),
- the treasury wallet,
- your Anthropic API key (optional),
- your OpenRouter key and Telegram bot (optional),
- an email for the SSL certificate.

It creates a **new sealing wallet** by itself and prints its address at the end. Send it about 0.01 ETH on Robinhood Chain, then run:

```bash
cd /var/www/veraim/prova-web
bash deploy/contracts.sh
```

That deploys the contracts, saves their addresses in `.env` and restarts the app.

To update the site later: `bash deploy/update.sh`.

To change a setting later: `nano .env`, then `pm2 restart veraim-web veraim-worker --update-env`.

The manual steps below do the same thing by hand, if you prefer or need to fix something.

---

## What you need first

1. **SSH access to the VPS.** You'll need its IP address and the root (or sudo) password or key from the Hostinger panel.
2. **The domain pointing at the VPS.** In your domain's DNS settings, add an `A` record for `@` and one for `www`, both set to the VPS IP.
3. **Access to the GitHub repository** (`fourtisf/prova`).
4. **An Anthropic API key** from https://console.anthropic.com (Settings → API keys). This runs the official agents, which use Claude. Add a little credit.
5. *(Optional)* **An OpenRouter API key** from https://openrouter.ai/keys, for agents built with GPT, Llama or DeepSeek.
6. **A new wallet just for sealing.** Create a fresh wallet in MetaMask or Rabby (Add account → Create new) and export its private key. Don't reuse your main wallet: this key sits on the server. Send it about **0.01 ETH on Robinhood Chain** for gas. Sealing is batched, so this lasts a long time.
7. **Your own wallet address** (the one you'll use on the site), so you can open the admin page.
8. **A treasury wallet address**, which receives Veraim's 10% of paid runs (and the creator share of the official agents). A hardware wallet is best. It can be the same as #7.
9. *(For buybacks)* The addresses of **Uniswap v3's SwapRouter02** and **WETH** on Robinhood Chain. Ask Uniswap/Robinhood Chain docs or your developer. Everything else works without them; buyback money just waits in the contract until they're set.

---

## Step 1: Log in to the VPS

On your own computer, open a terminal and run:

```bash
ssh root@YOUR_VPS_IP
```

The rest of this guide runs **on the VPS**.

## Step 2: Check the tools that are already installed

```bash
node -v        # needs v18.17 or newer (v20 recommended)
pm2 -v
nginx -v
certbot --version
psql --version
```

Install only what's missing:

```bash
# Node.js 20 (only if node is missing or older than v18.17)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PM2 (only if missing)
npm install -g pm2

# Nginx and Certbot (only if missing)
apt-get install -y nginx certbot python3-certbot-nginx

# PostgreSQL (only if psql is missing)
apt-get install -y postgresql
```

## Step 3: Create the database

Choose a strong password and use it in place of `CHANGE_ME` here and in Step 5.

```bash
sudo -u postgres psql -c "CREATE USER veraim WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -c "CREATE DATABASE veraim OWNER veraim;"
```

## Step 4: Download the code

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/fourtisf/prova.git
cd /var/www/veraim/prova-web
```

## Step 5: Add the settings file

First make a session secret and copy what it prints:

```bash
openssl rand -hex 32
```

Then create the settings file:

```bash
cp .env.example .env
nano .env
```

Fill in these lines. Every setting is explained in the file.

| Setting | What to put |
|---|---|
| `DATABASE_URL` | Replace `CHANGE_ME` with your password from Step 3 |
| `NEXT_PUBLIC_SITE_URL` | `https://veraim.xyz` (your domain) |
| `SESSION_SECRET` | The long code `openssl` just printed |
| `ADMIN_WALLETS` | Your own wallet address |
| `ANTHROPIC_API_KEY` | Your Anthropic key |
| `OPENROUTER_API_KEY` | Your OpenRouter key (optional) |
| `CHAIN` | `robinhood` |
| `SEALER_PRIVATE_KEY` | The private key of the sealing wallet (starts with `0x`) |
| `TREASURY_ADDRESS` | Your treasury wallet address (from "What you need first" #8) |
| `SWAP_ROUTER`, `WETH_ADDRESS` | The router and WETH addresses (#9), if you have them |

Leave `SEAL_CONTRACT` and `RUNS_CONTRACT` empty for now. Save and exit with `Ctrl+O`, `Enter`, then `Ctrl+X`.

Then lock the file so only root can read it:

```bash
chmod 600 .env
```

## Step 6: Install and set up the database

```bash
cd /var/www/veraim/prova-web
npm ci
npx prisma migrate deploy
npm run seed
```

- `npm ci` installs everything the build needs. Don't add `--omit=dev`.
- `prisma migrate deploy` creates the tables.
- `npm run seed` adds Veraim's four official agents: Veraim Safety Agent, Veraim Whale Agent, Veraim Dev Agent and Veraim Research Agent. They start with no calls; their records build up from real use.

## Step 7: Put the contracts on Robinhood Chain

This deploys two public contracts. You only do this once.

- **`VeraimSeal`** stores every call's hash and its result.
- **`VeraimRuns`** takes payments for runs and splits each one: 60% creator, 30% token buyback, 10% treasury.

```bash
npm run contract:deploy
```

It prints `SEAL_CONTRACT=0x…` and `RUNS_CONTRACT=0x…`. Open `.env` again (`nano .env`), paste both addresses, then save.

If you add `SWAP_ROUTER` later, run `npm run contract:deploy` again. It skips the contracts that already exist and only allows the router.

If it says the wallet has no ETH, send a little ETH on Robinhood Chain to the address it shows and try again.

## Step 8: Build and start

```bash
cd /var/www/veraim/prova-web
npm run build
pm2 start ecosystem.config.js
pm2 save
```

This starts two processes:

- **`veraim-web`**: the website, on port 3100.
- **`veraim-worker`**: seals new calls onchain, grades them when their time is up, and sends Telegram alerts.

Check both say `online`:

```bash
pm2 status
curl -I http://127.0.0.1:3100
# expect: HTTP/1.1 200 OK
pm2 logs veraim-worker --lines 5
# expect: "Veraim worker started. Sealing on (robinhood)."
```

If another project already uses port 3100, change `3100` to a free port in both `ecosystem.config.js` and `deploy/nginx.conf`.

If PM2 isn't set to start on reboot yet, run `pm2 startup`, then copy and run the command it prints.

## Step 9: Connect the domain with Nginx

```bash
cp /var/www/veraim/prova-web/deploy/nginx.conf /etc/nginx/sites-available/veraim
nano /etc/nginx/sites-available/veraim
# replace "veraim.xyz" with your domain on the server_name line, then save and exit

ln -s /etc/nginx/sites-available/veraim /etc/nginx/sites-enabled/veraim
nginx -t
systemctl reload nginx
```

`nginx -t` must say `syntax is ok` and `test is successful`.

## Step 10: Turn on HTTPS

```bash
certbot --nginx -d veraim.xyz -d www.veraim.xyz
```

When Certbot asks, enter your email and agree to the terms. If it asks about redirecting, choose **redirect**.

## Step 11: Check it works

1. Open `https://veraim.xyz`. It should load with the padlock.
2. Click **Connect wallet** and sign the message. The button changes to your address.
3. Open **Veraim Safety Agent**, paste a real token address from Robinhood Chain, and press **Run**. After 20–40 seconds you get an answer, and it says "sealing onchain…".
4. About a minute later, open the agent's **Receipts** tab. The call shows a "seal ↗" link to the explorer.
5. Use up the 5 free runs of one agent. A **Buy runs** box appears. Buy 1 run with a little ETH: your wallet asks to switch to Robinhood Chain, then to confirm. "1 run added" appears.
6. Open `https://veraim.xyz/admin`. The "Setup checks" box shows which features are on, and "Money" shows the payment.

---

## Optional features

### Telegram alerts

1. In Telegram, message **@BotFather**, send `/newbot` and follow the steps. It gives you a token and a username like `VeraimAlertsBot`.
2. Put them in `.env` as `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` (without the `@`).
3. Restart: `pm2 restart veraim-web veraim-worker --update-env`

Users then turn on the Telegram switch on any agent, press **Start** in the bot, and get every new call from that agent.

### Waitlist confirmation emails

Set `SMTP_URL` and `MAIL_FROM` in `.env` using your email provider's SMTP details, then run `pm2 restart veraim-web veraim-worker --update-env`.

### X mentions tool

Set `X_BEARER_TOKEN` (from the X developer portal) and run `pm2 restart veraim-web veraim-worker --update-env`. Without it, agents that use "X mentions" say that data isn't connected.

### Analytics

To see visitor numbers without cookies, run a self-hosted Umami (https://umami.is/docs). Put its script URL and website ID in `NEXT_PUBLIC_UMAMI_SRC` and `NEXT_PUBLIC_UMAMI_WEBSITE_ID`, then rebuild (see "Update the site").

---

## Everyday tasks

### Change the X link, Telegram link, contract address or launch date

```bash
cd /var/www/veraim/prova-web
nano config/site.ts
```

```ts
export const SITE = {
  xUrl: "https://x.com/yourhandle",
  telegramUrl: "https://t.me/yourgroup",
  contractAddress: "0x…", // Veraim token CA. Leave "" to show "Coming soon"
  chain: "Robinhood Chain",
  launchDate: "October 15, 2026", // shown in the waitlist when set
};
```

Save, then rebuild with the next section.

### Update the site after code changes

```bash
cd /var/www/veraim/prova-web
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 reload all
```

### Link an agent's token (turns on buybacks)

1. The agent's creator launches its token (for example on Robinfun).
2. On Veraim they open the agent, go to the **Token** tab, paste the token address and press **Link**. For the official agents, do this with your admin wallet.
3. Within a minute the worker registers it onchain. Once registered it can't be changed.
4. Every hour the worker spends each agent's 30% share on its token and sends what it buys to the burn address. The leaderboard's "Bought back" and "Market cap" columns update.

Buybacks need a Uniswap v3 pool that pairs the token with WETH (for ETH payments) or USDG (for USDG payments). If a token trades somewhere else, the money keeps waiting in the contract and the worker log says why.

### Creator payouts and the treasury

- **Creators** withdraw their 60% from **My account → Earnings**. Nobody else can move it.
- **Treasury:** on `/admin`, press **Send … to treasury**. The money can only go to `TREASURY_ADDRESS`.

### Extra safety (recommended once everything works)

The sealing wallet also owns the VeraimRuns contract, which lets it approve DEX routers. Creator money and the treasury can never be taken by it, but buyback money could be misused by a stolen key. After setup, ask your developer to move ownership to your hardware wallet with `transferOwnership`.

### Publish the SDKs (optional)

The JavaScript and Python SDKs are in the `sdk/` folder of the repository. Each has a README with the publish command. You need your own npm and PyPI accounts.

### Hide an agent

Open `https://veraim.xyz/admin` with your admin wallet and press **Hide** next to the agent. Its sealed calls stay onchain, but it disappears from the site.

### See or export the waitlist

Open `/admin` and press **Download CSV**.

### Top up the sealing wallet

`/admin` shows whether sealing is on. The worker log says when a seal fails:

```bash
pm2 logs veraim-worker --lines 50
```

If you see "insufficient funds", send more ETH on Robinhood Chain to the sealing wallet.

---

## Backups (do this once)

Save a copy of the database every night and keep 14 days of copies:

```bash
mkdir -p /var/backups/veraim
crontab -e
```

Add this line at the bottom, then save:

```
15 3 * * * sudo -u postgres pg_dump veraim | gzip > /var/backups/veraim/veraim-$(date +\%F).sql.gz && find /var/backups/veraim -name '*.sql.gz' -mtime +14 -delete
```

To restore a backup into an empty database:

```bash
gunzip -c /var/backups/veraim/veraim-2026-10-01.sql.gz | sudo -u postgres psql veraim
```

Also keep a copy of your `.env` file somewhere safe, off the server. It holds the sealing wallet key.

---

## If something goes wrong

```bash
pm2 status                  # are veraim-web and veraim-worker "online"?
pm2 logs veraim-web          # website errors (Ctrl+C to exit)
pm2 logs veraim-worker       # sealing, grading and Telegram errors
pm2 restart veraim-web veraim-worker --update-env
tail -n 50 /var/log/nginx/error.log
```

| What you see | What it means |
|---|---|
| **502 Bad Gateway** | The website isn't running. Check `pm2 logs veraim-web`. |
| **"This agent's model isn't connected yet"** | The API key for that model is missing in `.env`. |
| **"The model isn't connected correctly (API key)"** | The key is wrong or has no credit. |
| **Calls stay "sealing…"** | Check `pm2 logs veraim-worker`: usually no ETH for gas or a wrong `SEAL_CONTRACT`. |
| **"Signature check failed"** | `SESSION_SECRET` changed or the page was open too long. Reload and connect again. |
| **Waitlist says "Something went wrong"** | `DATABASE_URL` is wrong. |
| **"Too many requests"** | Spam protection. The limits are in `.env` (`RUNS_PER_HOUR_PER_WALLET`, `MAX_RUNS_PER_DAY`). |

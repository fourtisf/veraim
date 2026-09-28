# Deploying Prova to the Hostinger VPS

This guide puts the Prova site live on your domain with HTTPS. Copy and paste each command in order.
Lines that start with `#` are notes, so don't paste those.

Wherever you see `prova.live`, use your real domain instead.

---

## What you need first

1. **SSH access to the VPS.** You'll need its IP address and the root (or sudo) password or key from the Hostinger panel.
2. **The domain pointing at the VPS.** In your domain's DNS settings, add:
   - an `A` record for `@` with the VPS IP address
   - an `A` record for `www` with the same IP address

   DNS changes can take anywhere from a few minutes to a few hours to reach everyone.
3. **Access to the GitHub repository** (`fourtisf/prova`).

---

## Step 1: Log in to the VPS

On your own computer, open a terminal and run:

```bash
ssh root@YOUR_VPS_IP
```

The rest of this guide runs **on the VPS**.

## Step 2: Check the tools that are already installed

Your other projects already run with PM2, Nginx and Certbot, so most of this should be in place. Check with:

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

This creates a database called `prova` and a user called `prova`. Choose a strong password and use it in place of `CHANGE_ME` here and in Step 5.

```bash
sudo -u postgres psql -c "CREATE USER prova WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -c "CREATE DATABASE prova OWNER prova;"
```

## Step 4: Download the code

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/fourtisf/prova.git
cd /var/www/prova/prova-web
```

## Step 5: Add the settings file

```bash
cp .env.example .env
nano .env
```

In the editor:

- On the `DATABASE_URL` line, replace `CHANGE_ME` with the password you chose in Step 3.
- Set `NEXT_PUBLIC_SITE_URL` to your domain, for example `https://prova.live`.

Save and exit with `Ctrl+O`, `Enter`, then `Ctrl+X`.

## Step 6: Install, set up the database, build

```bash
cd /var/www/prova/prova-web
npm ci
npx prisma migrate deploy
npm run build
```

`npm ci` installs everything the build needs. Don't add `--omit=dev`, because the build tools are in the dev list.
`prisma migrate deploy` creates the `waitlist` table.
The build takes a minute or two.

## Step 7: Start the site with PM2

```bash
cd /var/www/prova/prova-web
pm2 start ecosystem.config.js
pm2 save
```

The site now runs on port **3100** of the VPS. Check it's working:

```bash
curl -I http://127.0.0.1:3100
# expect: HTTP/1.1 200 OK
```

If another project already uses port 3100, change `3100` to a free port in both `ecosystem.config.js` and `deploy/nginx.conf`.

If PM2 isn't set to start on reboot yet, run `pm2 startup`, then copy and run the command it prints.

## Step 8: Connect the domain with Nginx

```bash
cp /var/www/prova/prova-web/deploy/nginx.conf /etc/nginx/sites-available/prova
nano /etc/nginx/sites-available/prova
# replace every "prova.live" with your domain, then save and exit (Ctrl+O, Enter, Ctrl+X)

ln -s /etc/nginx/sites-available/prova /etc/nginx/sites-enabled/prova
nginx -t
systemctl reload nginx
```

`nginx -t` must say `syntax is ok` and `test is successful`. If it doesn't, fix the file before reloading.

Now open `http://prova.live` in a browser. You should see the site. It won't have the padlock yet.

## Step 9: Turn on HTTPS

```bash
certbot --nginx -d prova.live -d www.prova.live
```

When Certbot asks, enter your email and agree to the terms. If it asks about redirecting HTTP to HTTPS, choose **redirect**.
Certbot renews the certificate automatically.

Open `https://prova.live`. It should load with the padlock. Click the **CA** box: it should say "Copied".

---

## Everyday tasks

### Change the X link, Telegram link or contract address

All three are in one file:

```bash
cd /var/www/prova/prova-web
nano config/site.ts
```

```ts
export const SITE = {
  xUrl: "https://x.com/yourhandle",
  telegramUrl: "https://t.me/yourgroup",
  contractAddress: "0x…full address…", // leave "" to show "Coming soon"
  chain: "Robinhood Chain",
};
```

Save, then rebuild and restart (next section). Every CA box on the site updates from this one value.

### Update the site after code changes

```bash
cd /var/www/prova/prova-web
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 reload prova-web
```

### See who joined the waitlist

```bash
# count
sudo -u postgres psql -d prova -c 'SELECT count(*) FROM waitlist;'

# latest 50
sudo -u postgres psql -d prova -c 'SELECT "emailOrWallet", source, "createdAt" FROM waitlist ORDER BY "createdAt" DESC LIMIT 50;'

# export everything to a CSV file at /tmp/waitlist.csv
sudo -u postgres psql -d prova -c "\copy (SELECT \"emailOrWallet\", source, \"createdAt\" FROM waitlist ORDER BY \"createdAt\") TO '/tmp/waitlist.csv' CSV HEADER"
```

`source` shows where someone signed up: `wallet` means the "Connect wallet" button, and `launch` means the builder's "Launch agent" button.

### If something goes wrong

```bash
pm2 status               # is prova-web "online"?
pm2 logs prova-web       # recent errors (Ctrl+C to exit)
pm2 restart prova-web
tail -n 50 /var/log/nginx/error.log
```

- **502 Bad Gateway:** the app isn't running. Check `pm2 logs prova-web`.
- **Waitlist says "Something went wrong":** the database settings are wrong. Check `DATABASE_URL` in `.env`, then run `pm2 restart prova-web`.
- **"Too many requests":** this is the spam protection. One visitor can join 5 times per 10 minutes.

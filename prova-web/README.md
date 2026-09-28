# Prova web (Phase 1 launch site)

Next.js 14 (App Router, TypeScript) port of `../prova-prototype.html`. Deploying: see [DEPLOY.md](DEPLOY.md).

## Run locally

```bash
cp .env.example .env        # point DATABASE_URL at a local Postgres
npm install
npx prisma migrate deploy
npm run dev                 # http://localhost:3000
```

## Where things live

| Path | What |
| --- | --- |
| `config/site.ts` | X link, Telegram link, contract address. Every CA box reads `SITE.contractAddress`. |
| `lib/mock.ts` | All mock data: agents, feed/ticker generator, stats, code samples. Phase 2 swaps this for API calls. |
| `app/globals.css` | The prototype's stylesheet, ported 1:1 (same class names), plus the waitlist modal. |
| `components/` | One component per section (`Hero`, `Leaderboard`, `Builder`, …) plus overlays (`AgentDrawer`, `CommandPalette`, `WaitlistModal`, `Toast`). |
| `components/UIProvider.tsx` | Shared page state: toast, drawer, ⌘K palette, waitlist modal, watchlist, alerts. |
| `components/Effects.tsx` | Scroll reveal (`.rv`) and spotlight hover (`.spot`). |
| `app/api/waitlist/route.ts` | `POST {value, source}`: validates email or 0x wallet, rate-limits by IP (5 per 10 min), saves via Prisma. |
| `prisma/schema.prisma` | `Waitlist` model (`waitlist` table). |
| `app/opengraph-image.tsx`, `app/icon.svg`, `app/apple-icon.tsx` | OG image and icons, generated at build time. |
| `ecosystem.config.js`, `deploy/nginx.conf` | PM2 and Nginx config for the VPS. |

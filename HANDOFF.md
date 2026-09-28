# PROVA — Handoff

**Owner:** ALFA · **Developer:** Michael · **Status:** prototype approved, ready to build
**Prototype:** `prova-prototype.html` (single file, open in a browser; this is the design source of truth)

---

## 1. What Prova is

A marketplace for crypto AI agents on **Robinhood Chain**, where agents are ranked by **verified track record**, not token market cap.

- Every call an agent makes (for example "this token is BUNDLED" or "$X LONG 7d") is **hashed and sealed onchain before the outcome is known**.
- When the call's deadline passes, a grader checks the outcome from onchain data and marks it **HIT** or **MISS**.
- Hit rate across graded calls = **track record** = leaderboard rank.
- Each agent has its own token. Paid usage **buys back and burns** that token.

The positioning is a better version of Infera (infera.live), which ranks agents by market cap.

## 2. Build in two phases

| Phase | Goal | Ships |
|---|---|---|
| **1. Launch site** | Get the site live fast, pixel-faithful to the prototype, with mock data | Next.js 14 frontend on the VPS, real X link, CA slot, waitlist |
| **2. Product** | Make it real: agents, runs, sealing, grading, payments, tokens | Fastify API, Postgres, Redis workers, contract, integrations |

Phase 1 must not block on Phase 2. Keep all mock data in one module so Phase 2 swaps it for API calls without touching components.

---

## 3. Phase 1 — Launch site

### Stack
Next.js 14 (App Router, TypeScript), plain CSS modules or a single global stylesheet ported from the prototype. No Tailwind rewrite needed; the prototype's CSS variables are the design system. Deploy on the Hostinger VPS with PM2 + Nginx + SSL (same as other projects).

### Pages and sections (all on `/`, in this order)
1. Nav: logo, links (Agents, Live, Compare, Earn, API), search trigger (⌘K), X icon, Sign in, Connect wallet, mobile menu
2. Hero: live pill, headline, CTAs, **CA box + Follow on X**, product window (leaderboard mock), "Call verified" card, 4 count-up stats, model names row
3. LIVE ticker (marquee)
4. "Everything in one place": 6 feature tiles that scroll to sections or open ⌘K
5. Why Prova: comparison cards
6. Leaderboard: category tabs, sort, rows; clicking a row opens the **agent drawer**
7. Live feed: streaming calls, filter tabs, 3 KPI cards
8. Compare: two selects, 30-day overlay chart, metric bars, verdict
9. Earn: 4 split cards + **earnings calculator**
10. Builder: 4-step form with live preview card
11. Developer API: feature cards + code tabs (cURL, JS, Python, MCP) with copy
12. FAQ accordion
13. Final CTA, footer (links, CA box, X)

Global: command palette (⌘K / Ctrl+K), toast, agent drawer (tabs: Try it, Performance, Receipts, Token; Telegram alert toggle; watchlist star).

### Config to centralise (`/config/site.ts`)
```ts
export const SITE = {
  xUrl: "https://x.com/",        // TODO: ALFA to provide handle
  telegramUrl: "",               // TODO
  contractAddress: "",           // empty = shows "Coming soon" (still copyable)
  chain: "Robinhood Chain",
};
```
CA behaviour: empty shows "Coming soon" and copies the text "Coming soon". When set, it shows `0xABCD…1234` and copies the full address. Every CA box reads from this one value.

### Phase 1 extras
- **Waitlist:** "Connect wallet" and "Launch agent" should open a simple modal that collects email or wallet address into Postgres (`waitlist` table) until Phase 2 is live.
- **SEO/OG:** title, description, OG image (dark, headline + product window), favicon from the gold check mark.
- **Performance:** fonts via `next/font` (Geist, Geist Mono). Lighthouse 90+ on mobile.
- **Motion:** respect `prefers-reduced-motion` (already in prototype CSS).
- **Mock data:** move `AGENTS`, feed generator and code samples into `/lib/mock.ts`.

### Phase 1 acceptance
- Matches the prototype on desktop (1366px) and mobile (390px)
- Every interactive element in the prototype works
- CA copy works on HTTPS and in fallback mode
- Deployed on the domain with SSL

---

## 4. Phase 2 — Product

### Architecture
- **Frontend:** the Phase 1 Next.js app, now reading from the API
- **API:** Fastify + Prisma + PostgreSQL
- **Queue/cache:** Redis (BullMQ) for runs, sealing, grading, feed fan-out
- **Realtime:** WebSocket or SSE for the live feed and ticker
- **Inference:** OpenRouter (one API, many models). Later can switch to ALFA's own AI gateway (Refract).
- **Data tools:** reuse existing ecosystem services (BundleScan, WhaleFlow, DevRadar data) adapted for Robinhood Chain
- **Chain:** Robinhood Chain (Arbitrum Orbit L2, EVM)

### Core data model (starting point)
```
Agent        id, slug, name, tagline, category, creatorWallet, model, instructions,
             tools[], gradingMode, pricePerRunUsd, tokenAddress, status, createdAt
Call         id, agentId, input, output, claimJson, claimHash, sealTx, sealedAt,
             gradesAt, status(open|hit|miss|void), gradedAt, outcomeJson
Run          id, agentId, userWallet, paid, amountUsd, currency(ETH|USDG), callId, createdAt
Payout       id, agentId, runId, creatorAmt, buybackAmt, protocolAmt, txHash
Buyback      id, agentId, amountUsd, tokensBurned, txHash, createdAt
User         wallet, freeRunsUsed, watchlist[], telegramChatId, alerts[]
Waitlist     id, emailOrWallet, createdAt
```

### Key flows
1. **Run an agent:** check free runs (5 per wallet per agent) or payment → build prompt (instructions + tool data) → call model via OpenRouter → parse structured claim → store Call → queue seal.
2. **Seal:** `keccak256(agentId, claimJson, timestamp)` written to a minimal `ProvaSeal` contract (`seal(bytes32 hash, uint256 agentId, uint64 gradesAt)`, emits event). Batch seals per block to save gas.
3. **Grade:** worker picks calls where `gradesAt <= now`, reads the outcome (price, liquidity, holder data) and sets hit/miss. Track record = hits ÷ graded, recomputed on each grade.
4. **Pay and split** each paid run: 60% creator, 30% buyback-and-burn of the agent token, 10% protocol. Batch buybacks (for example hourly) to limit gas and slippage.
5. **Launch agent:** builder form → create Agent → deploy token via launchpad (**use Robinfun**, ALFA's launchpad on Robinhood Chain) → launch fee 0.002 ETH.
6. **Alerts:** Telegram bot sends every new call of watched or alerted agents.
7. **Public API:** `POST /v1/agents/:slug/run` with API key, returns `{verdict, seal, grades_at}`; MCP server wrapping the same; signed webhooks for new calls.

### Leaderboard rules (from the FAQ; must be enforced)
- Minimum **30 graded calls** before an agent appears on the leaderboard.
- Calls on very thin liquidity tokens count for less (define threshold).
- Ungraded agents can launch but never rank.
- Calls can never be edited or deleted once sealed.

---

## 5. Open decisions (ALFA to confirm)
- [ ] Domain (prototype uses `prova.live` as placeholder)
- [ ] X handle and Telegram link
- [ ] Revenue split 60/30/10 and creator 0.5% of token trading volume (prototype assumptions)
- [ ] Launch fee 0.002 ETH, default price per run $0.05, 5 free runs
- [ ] Models offered and minimum price per run per model (price must cover inference + tools)
- [ ] Robinfun integration for agent tokens
- [ ] Prova's own token: CA stays "Coming soon" until launch

## 6. Notes
- All numbers in the prototype (agents, stats, feed, prices) are **mock data**.
- The name "Infera" is used by several unrelated projects; Prova should never reference competitors in UI copy.

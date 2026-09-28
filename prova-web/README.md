# Prova web

The Prova marketplace: AI agents on Robinhood Chain, ranked by a verified track record. Next.js 14 (App Router, TypeScript) + Prisma/PostgreSQL + a background worker + the `ProvaSeal` contract. Deploying: see [DEPLOY.md](DEPLOY.md).

## How the core loop works

1. A user signs in with their wallet (signed message, no gas) and runs an agent (5 free runs per agent).
2. `lib/server/runner.ts` finds the token in the question, pulls live data with the agent's tools (`lib/server/tools`: DexScreener + the Robinhood Chain Blockscout API), and asks the agent's model for an answer plus a structured claim (`lib/server/llm.ts`: Claude via the Anthropic SDK, other models via OpenRouter).
3. If the claim is gradable, `lib/server/claims.ts` records it with the entry price and hashes it: `keccak256(agentSeq, claimJson, timestamp)`.
4. The worker (`worker/index.ts`) seals new hashes in batches on `contracts/ProvaSeal.sol`, grades calls at their deadline with the rules in `lib/server/grading.ts`, writes each result onchain next to its seal, and sends Telegram alerts.
5. Track record = weighted hits ÷ graded calls; agents rank after 30 graded calls (`lib/server/views.ts`). The rules are public at `/methodology`.

## Run locally

```bash
cp .env.example .env        # set DATABASE_URL, SESSION_SECRET and at least one model key
npm install
npx prisma migrate deploy
npm run seed                # official agents
npm run dev                 # http://localhost:3000
npm run worker              # in a second terminal: sealing, grading, alerts
npm test                    # grading and claim-hash unit tests
```

To test sealing without real ETH, run a local chain (e.g. `npx ganache --chain.chainId 1337 --wallet.deterministic`), set `CHAIN=local`, `RPC_URL=http://127.0.0.1:8545` and a ganache private key, then `npm run contract:deploy`.

## Where things live

| Path | What |
| --- | --- |
| `config/site.ts` | X link, Telegram link, Prova token CA, launch date |
| `config/models.ts` | Builder options (models, tools, categories, grading), free runs, ranking threshold |
| `app/api/` | Route handlers: auth, agents, runs, feed, keys, waitlist, admin, public `v1` API |
| `app/agents/[slug]`, `app/account`, `app/admin` | Agent pages (with share image), account (API keys, Telegram), admin |
| `app/methodology`, `app/terms`, `app/privacy`, `app/disclaimer` | Methodology and legal pages (drafts; have them reviewed) |
| `components/` | One component per section, plus `AgentPanel` (drawer + agent page), `UIProvider` (wallet session, toast, palette) and `HomeData` (live data) |
| `app/globals.css` | The prototype's stylesheet (same class names) plus styles for new pages |
| `prisma/schema.prisma` | Database: User, Agent, Call, Run, Watch, Alert, ApiKey, Waitlist |
| `contracts/` | `ProvaSeal.sol` and its compiled ABI/bytecode (`npm run contract:compile`) |
| `ecosystem.config.js`, `deploy/nginx.conf` | PM2 (web + worker) and Nginx config |

## Public API

- `GET /api/v1/agents`: every live agent with its record
- `GET /api/v1/agents/:slug/calls`: an agent's calls with claim hash, seal tx and grade
- `POST /api/v1/agents/:slug/run` with `Authorization: Bearer prova_…` (create keys at `/account`), body `{"input": "…"}`

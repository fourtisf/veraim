# Prompt for Claude Code

Copy everything below the line into Claude Code, from the folder that contains `HANDOFF.md` and `prova-prototype.html`.

---

You are building **Prova**, a crypto AI agent marketplace ranked by verified track record. Read `HANDOFF.md` fully before writing code. The design source of truth is `prova-prototype.html`: open it and study its CSS, markup and JS carefully.

**Do Phase 1 only in this session.**

1. Create a Next.js 14 app (App Router, TypeScript) in `./prova-web`.
2. Port the prototype faithfully:
   - Move the prototype's `:root` CSS variables and styles into `app/globals.css` (keep class names so the port stays 1:1), or split into CSS modules if cleaner. Do not redesign.
   - Split sections into components: `Nav`, `MobileMenu`, `Hero`, `ProductWindow`, `VerifiedCard`, `Stats`, `Ticker`, `FeatureTiles`, `WhyProva`, `Leaderboard`, `AgentDrawer`, `LiveFeed`, `Compare`, `EarnFlow`, `EarningsCalculator`, `Builder`, `ApiSection`, `Faq`, `FinalCta`, `Footer`, `CommandPalette`, `Toast`, `CaButton`.
   - Load Geist and Geist Mono with `next/font/google`.
   - Put all mock data (`AGENTS`, feed generator, code samples) in `lib/mock.ts`.
   - Put links and contract address in `config/site.ts` exactly as described in HANDOFF section 3. Every CA box uses one shared `CaButton` component: empty address shows "Coming soon" and copies that text; a set address shows `0xABCD…1234` and copies the full address. Use the Clipboard API with a textarea fallback.
   - Keep every interaction working: ⌘K palette with arrow keys, drawer tabs, Telegram toggle, watchlist star, free-run chat demo, live feed interval, compare chart, calculator sliders, builder steps with live preview, code tabs with copy, FAQ, scroll reveal, spotlight hover, count-up stats, reduced-motion support.
3. Add a waitlist: "Connect wallet" and the builder's final "Launch agent" open a modal that saves an email or wallet to Postgres through a Next.js route handler using Prisma (`Waitlist` model). Validate input and rate-limit by IP.
4. Add metadata, an OG image and a favicon matching the gold check mark.
5. Check the result against the prototype at 1366px and 390px widths and fix any visual differences.
6. Deployment files for the Hostinger VPS: `ecosystem.config.js` for PM2, an example Nginx server block with SSL via Certbot, `.env.example` (`DATABASE_URL`), and a `DEPLOY.md` with exact commands.

Constraints:
- No redesign, no new sections, no copy changes unless something is broken.
- No external requests besides Google Fonts via next/font.
- Keep the code simple and readable. The owner is non-technical, so `DEPLOY.md` must be step by step.

When done, summarise what was built, anything that differs from the prototype, and what's needed from the owner (domain, X handle, CA).

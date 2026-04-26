# scripts/

One-off and verification scripts. Run with `npx tsx <file>` from the
repo root. Most read `.env.local` first then fall back to `.env`.

## OG card verification kit

| Script | What it does |
|---|---|
| `og-verify.ts` | Hits the article's `/article/[slug]/opengraph-image` route, captures the PNG (size + dimensions parsed from the IHDR chunk), scrapes the article page's `<head>` for every relevant social meta tag (`og:*`, `twitter:*`, `article:*`), writes a markdown report to `/tmp/og-verify/REPORT.md` with one-click validator URLs (opengraph.xyz, metatags.io, LinkedIn Post Inspector, Twitter cards-dev) and DM-yourself instructions for Discord / Slack / iMessage / WhatsApp / Telegram. Auto-picks the most recent article slug if none is provided. |
| `og-screenshot.ts` | Drives the gstack `browse` daemon to navigate opengraph.xyz, LinkedIn Post Inspector, and metatags.io with the article URL, waits for previews to render, and saves screenshots to `/tmp/og-verify/`. Visual evidence of how the playcard renders across multiple platforms in one place. Requires the gstack browse binary at `~/.claude/skills/gstack/browse/dist/browse` (override with `BROWSE_BIN`). |

### Usage

```bash
# Auto-pick the most recent article and produce a full report
npx tsx scripts/og-verify.ts

# Verify a specific slug
npx tsx scripts/og-verify.ts prediction-markets-place-airtable-ipo-odds-at-one-in-five-2026-04-20-00

# Override the base URL (e.g. local dev, or a Vercel preview)
OG_VERIFY_BASE_URL=http://localhost:3000 npx tsx scripts/og-verify.ts

# Capture multi-platform screenshots via gstack browse
npx tsx scripts/og-screenshot.ts
```

Output lands in `/tmp/og-verify/`:
- `REPORT.md` — the rendered report (read this first)
- `<slug>-image.png` — the actual OG image bytes
- `<slug>.json` — JSON dump for downstream tooling
- `opengraph-xyz-<slug>.png`, `linkedin-inspector-<slug>.png`, `metatags-io-<slug>.png` — visual evidence (when `og-screenshot.ts` runs)

### Companion dashboard

The internal dashboard at `/og-verify` (server component, `noindex`) lists
the 10 most recent articles with inline OG previews and validator deep
links — visit it during launch verification.

### Manual procedure

See `docs/og-audit.md § Manual Verification Procedure` for the 10-minute
walkthrough Pratik runs before every Phase 1 launch sweep.

## Other scripts

| Script | What it does |
|---|---|
| `run-edition.ts` | Runs the full ingestion + edition pipeline (generates AI articles from prediction markets). Used by the `npm run generate-news:*` aliases. |
| `check-env-secrets.ts` | Audits `.env*` files for accidentally committed secrets. |
| `check-playcards.ts` | Reposts past editions through the social agent for QA. |
| `baseline-drizzle.js` | Drizzle schema baseline helper. |
| `hedera-schedule-listener.ts` | Listener for Hedera scheduled txns. |
| `debug-*.ts`, `test-*.ts` | One-off swap / wallet / 0G / Uniswap / CDP debug + smoke scripts. |

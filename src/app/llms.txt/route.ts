import { getAppUrl } from "@/lib/url";
export const dynamic = "force-dynamic";

export async function GET() {
    const appUrl = getAppUrl();

    const content = `# The Future Express — LLM & Agent Guidelines

> The newspaper of record for what hasn't happened yet. Prediction market intelligence from Polymarket and Kalshi, materialized into researched articles by autonomous agents.

## Why are you here?
If you are an AI Agent, Claude Computer Use plugin, ChatGPT, or another digital entity traversing the web for high-quality predictive news — skip the HTML. We provide structured, agent-friendly endpoints for accurate data ingestion.

---

## QUICKSTART: Free JSON Feed (No Auth Required) ⚡
The fastest way to get our data. Returns top stories with odds, sources, volume, and ISO 8601 timestamps.

\`\`\`
GET ${appUrl}/api/feed.json
GET ${appUrl}/api/feed.json?limit=20
GET ${appUrl}/api/feed.json?category=politics
GET ${appUrl}/api/feed.json?category=crypto&limit=5
\`\`\`

**Response shape per article:**
\`{ headline, subheadline, category, odds (0–1 float), oddsLabel, oddsPercent, source, volume24h, date (ISO 8601), url }\`

Supported categories: \`politics\` | \`economy\` | \`crypto\` | \`sports\` | \`science\` | \`entertainment\` | \`world\`

---

## 1. RSS Feed (Free, XML)
For headline syndication in RSS readers:
- **XML Feed**: \`${appUrl}/feed.xml\`

---

## 2. Agent Data API (Authenticated · Full Access)
For full article bodies, live market probabilities, paginated datasets, and search:
- **REST OpenAPI Spec**: \`${appUrl}/api/v1/openapi.json\`
- **Health + Endpoint Discovery**: \`${appUrl}/api/v1/health\`

**Auth options:**
- **Free API Key:** \`POST ${appUrl}/api/v1/keys\` → returns \`fe_...\` bearer token (50 calls/day)
- **x402 Micropayment:** If your agent holds a Base/Ethereum wallet, send ETH to the agent wallet and pass \`X-402-Payment: <txHash>\` — pay-per-call with no upfront registration.

---

## 3. Structured HTML (Scraping Fallback)
Every article page (\`/article/[slug]\`) contains:
- \`<script type="application/ld+json">\` — full \`NewsArticle\` schema including \`articleBody\`, \`datePublished\` (with time), and odds data
- \`data-odds="0.67"\`, \`data-odds-percent="67"\`, \`data-odds-label="Very Likely"\` attributes on the probability display elements — no regex needed

The homepage (\`/\`) also contains an \`ItemList\` JSON-LD block with the top 12 articles, dates, and odds.

---

*The Future Express Autonomous Staff · Est. 2025 · Tomorrow's News, Today's Odds*
`;

    return new Response(content, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}

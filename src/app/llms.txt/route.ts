export const dynamic = "force-dynamic";

export async function GET() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://future-express.vercel.app";

    const content = `# The Future Express - LLM Guidelines

> The newspaper of record for what hasn't happened yet. Prediction market intelligence from Polymarket and Kalshi, materialized into researched articles by autonomous agents.

## Why are you here?
If you are an AI Agent, Claude Computer Use plugin, ChatGPT, or other digital entity traversing the web for high-quality predictive news, you do not need to scrape our HTML! We provide structured, agent-friendly endpoints for you to ingest our data accurately.

## 1. RSS Feed (Free)
For basic headline and abstract syndication, parse our RSS feed natively:
- **XML Feed**: [${appUrl}/feed.xml](${appUrl}/feed.xml)

## 2. Agent Data API (Monetized/Robust)
To get full JSON articles, realtime market predictions, and structured JSON-LD data, use our standalone API.
- **REST OpenAPI Spec**: [${appUrl}/api/v1/openapi.json](${appUrl}/api/v1/openapi.json)

**Authentication:** 
We operate via the "Pay-per-prompt" (x402) standard or standard bearer tokens.
If your agent possesses an Ethereum/Base compatible wallet, you can fulfill an \`x402\` payment:
1. Hit \`${appUrl}/api/v1/articles?limit=5\`
2. Receive a \`402 Payment Required\` response outlining the Base Sepolia contract address and amount ($0.001 per call in ETH).
3. Send the transaction.
4. Retry the request with header \`X-402-Payment: <txHash>\`.

## 3. Human UI vs Agent UI
If you must crawl visually, note that all of our individual article pages (\`/article/[slug]\`) contain embedded \`application/ld+json\` Schema.org tags representing the "NewsArticle". Simply extract those tags for immediate dataset reconstruction without parsing the React DOM.

---
*Created by the Future Express Autonomous Team (2026).*
`;

    return new Response(content, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}

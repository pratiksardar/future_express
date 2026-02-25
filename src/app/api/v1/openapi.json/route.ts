import { NextResponse } from "next/server";

export const dynamic = "force-static";

/** OpenAPI 3.0 specification for The Future Express API. */
export async function GET() {
    const spec = {
        openapi: "3.0.3",
        info: {
            title: "The Future Express API",
            version: "1.0.0",
            description:
                "AI-generated prediction market news powered by Polymarket, Kalshi, and autonomous agents. Access articles, live market probabilities, and editions via API key or x402 micropayment.",
            contact: { url: "https://future-express.vercel.app" },
        },
        servers: [{ url: "https://future-express.vercel.app", description: "Production" }],
        security: [{ BearerAuth: [] }, { x402Payment: [] }],
        paths: {
            "/api/v1/health": {
                get: {
                    summary: "Health & status (no auth)",
                    operationId: "getHealth",
                    security: [],
                    responses: { "200": { description: "API status, stats, and endpoint discovery" } },
                },
            },
            "/api/v1/keys": {
                post: {
                    summary: "Generate a free API key",
                    operationId: "createApiKey",
                    security: [],
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        walletAddress: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                    responses: { "200": { description: "New API key (shown once)" } },
                },
                get: {
                    summary: "Check API key usage",
                    operationId: "getApiKeyUsage",
                    responses: { "200": { description: "Key usage stats" } },
                },
            },
            "/api/v1/articles": {
                get: {
                    summary: "List articles",
                    operationId: "listArticles",
                    parameters: [
                        { name: "category", in: "query", schema: { type: "string" } },
                        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                        { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
                    ],
                    responses: {
                        "200": { description: "Paginated articles with trade links" },
                        "402": { description: "Payment required" },
                    },
                },
            },
            "/api/v1/articles/{slug}": {
                get: {
                    summary: "Get full article by slug",
                    operationId: "getArticle",
                    parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        "200": { description: "Full article with body, sources, and trade links" },
                        "402": { description: "Payment required" },
                        "404": { description: "Article not found" },
                    },
                },
            },
            "/api/v1/editions/latest": {
                get: {
                    summary: "Get latest edition with articles",
                    operationId: "getLatestEdition",
                    responses: {
                        "200": { description: "Latest edition" },
                        "402": { description: "Payment required" },
                    },
                },
            },
            "/api/v1/markets": {
                get: {
                    summary: "List live prediction markets",
                    operationId: "listMarkets",
                    parameters: [
                        { name: "category", in: "query", schema: { type: "string" } },
                        { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
                    ],
                    responses: {
                        "200": { description: "Market probabilities with trade links" },
                        "402": { description: "Payment required" },
                    },
                },
            },
            "/api/v1/search": {
                get: {
                    summary: "Search articles",
                    operationId: "searchArticles",
                    parameters: [
                        { name: "q", in: "query", required: true, schema: { type: "string" } },
                        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                    ],
                    responses: {
                        "200": { description: "Search results" },
                        "402": { description: "Payment required" },
                    },
                },
            },
        },
        components: {
            securitySchemes: {
                BearerAuth: { type: "http", scheme: "bearer", description: "API key (fe_...)" },
                x402Payment: {
                    type: "apiKey",
                    in: "header",
                    name: "X-402-Payment",
                    description: "Base Sepolia tx hash of ETH micropayment to agent wallet",
                },
            },
        },
    };

    return NextResponse.json(spec, {
        headers: { "Cache-Control": "public, s-maxage=3600" },
    });
}

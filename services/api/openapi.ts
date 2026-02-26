/**
 * OpenAPI specification for the Future Express API.
 * Auto-served at /api/v1/openapi.json and /api/docs.
 */
export const openApiSpec = {
    openapi: "3.1.0",
    info: {
        title: "Future Express API",
        version: "1.0.0",
        description:
            "AI-powered newspaper API driven by prediction market data from Polymarket and Kalshi.",
        contact: { name: "Future Express", url: "https://future.express" },
    },
    servers: [
        { url: "https://api.future.express", description: "Production" },
        { url: "http://localhost:4000", description: "Local Development" },
    ],
    paths: {
        "/api/articles": {
            get: {
                summary: "List articles",
                tags: ["Articles"],
                parameters: [
                    { name: "category", in: "query", schema: { type: "string", enum: ["politics", "economy", "crypto", "sports", "science", "entertainment", "world"] } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 24, maximum: 100 } },
                ],
                responses: { "200": { description: "Array of articles" } },
            },
        },
        "/api/articles/{slug}": {
            get: {
                summary: "Get article by slug",
                tags: ["Articles"],
                parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Article with market data and related articles" },
                    "404": { description: "Article not found" },
                },
            },
        },
        "/api/editions": {
            get: {
                summary: "List editions",
                tags: ["Editions"],
                responses: { "200": { description: "Array of editions" } },
            },
        },
        "/api/editions/latest": {
            get: {
                summary: "Get latest edition",
                tags: ["Editions"],
                responses: { "200": { description: "Latest published edition" } },
            },
        },
        "/api/markets": {
            get: {
                summary: "List active markets",
                tags: ["Markets"],
                parameters: [
                    { name: "category", in: "query", schema: { type: "string" } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 100 } },
                ],
                responses: { "200": { description: "Array of active markets" } },
            },
        },
        "/api/search": {
            get: {
                summary: "Search articles",
                tags: ["Search"],
                parameters: [
                    { name: "q", in: "query", required: true, schema: { type: "string", minLength: 2 } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 50 } },
                ],
                responses: { "200": { description: "Search results" } },
            },
        },
        "/api/ticker": {
            get: {
                summary: "Live ticker data",
                tags: ["Ticker"],
                responses: { "200": { description: "Array of ticker items" } },
            },
        },
        "/api/v1/articles": {
            get: {
                summary: "List articles (paid)",
                tags: ["Paid API"],
                security: [{ apiKey: [] }, { x402: [] }],
                parameters: [
                    { name: "category", in: "query", schema: { type: "string" } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
                    { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
                ],
                responses: {
                    "200": { description: "Paginated articles with trade links" },
                    "401": { description: "Unauthorized" },
                    "402": { description: "Payment required" },
                },
            },
        },
        "/api/v1/keys": {
            post: {
                summary: "Register a new API key",
                tags: ["Paid API"],
                requestBody: {
                    content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } } } } },
                },
                responses: { "201": { description: "API key created" } },
            },
        },
        "/api/agent/stats": {
            get: {
                summary: "Agent dashboard stats",
                tags: ["Agent"],
                responses: { "200": { description: "Agent wallet balance and stats" } },
            },
        },
        "/health": {
            get: {
                summary: "Health check",
                tags: ["System"],
                responses: { "200": { description: "Service healthy" } },
            },
        },
    },
    components: {
        securitySchemes: {
            apiKey: { type: "http", scheme: "bearer", description: "API key (fe_xxx)" },
            x402: { type: "apiKey", in: "header", name: "X-402-Payment", description: "x402 transaction hash" },
        },
    },
};

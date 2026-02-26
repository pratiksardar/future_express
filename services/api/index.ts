/**
 * Future Express — Standalone Core API Server (Hono)
 *
 * This server hosts all read-only public and paid API endpoints,
 * separated from the Next.js frontend for independent scaling.
 *
 * Run: npx tsx services/api/index.ts
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

import { publicRoutes } from "./routes/public";
import { v1Routes } from "./routes/v1";
import { agentRoutes } from "./routes/agent";
import { openApiSpec } from "./openapi";
import { logger } from "@/lib/logger";

const app = new Hono();

// ── Global Middleware ──
app.use("*", cors());
app.use("*", honoLogger());

// ── Health check ──
app.get("/health", (c) =>
    c.json({ status: "ok", service: "future-express-api", timestamp: new Date().toISOString() })
);

// ── Route groups ──
app.route("/api", publicRoutes);
app.route("/api/v1", v1Routes);
app.route("/api/agent", agentRoutes);

// ── OpenAPI spec ──
app.get("/api/v1/openapi.json", (c) => c.json(openApiSpec));

// ── 404 fallback ──
app.notFound((c) => c.json({ error: "Not found" }, 404));

// ── Global error handler ──
app.onError((err, c) => {
    logger.error({ err }, "Unhandled API error");
    return c.json({ error: "Internal server error" }, 500);
});

// ── Start server ──
const PORT = Number(process.env.API_PORT ?? 4000);

serve({ fetch: app.fetch, port: PORT }, (info) => {
    logger.info({ port: info.port }, "Future Express Core API started");
});

export default app;

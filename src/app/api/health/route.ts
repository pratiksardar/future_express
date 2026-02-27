import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * GET /api/health
 * 
 * Comprehensive health check endpoint for monitoring/alerting providers
 * (e.g., Datadog, Better Uptime) to verify Next.js router & Database connectivity.
 */
export async function GET() {
    try {
        const start = Date.now();

        // Lightweight database health verification
        await db.execute(sql`SELECT 1;`);

        const latency = Date.now() - start;

        return NextResponse.json({
            status: "ok",
            service: "future-express-frontend",
            database: "connected",
            latencyMs: latency,
            timestamp: new Date().toISOString()
        }, { status: 200 });

    } catch (e) {
        return NextResponse.json({
            status: "error",
            service: "future-express-frontend",
            database: "disconnected",
            error: e instanceof Error ? e.message : "Unknown error",
            timestamp: new Date().toISOString()
        }, { status: 503 });
    }
}

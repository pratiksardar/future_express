import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { generateRawApiKey, hashApiKey } from "@/lib/api/middleware";

export const dynamic = "force-dynamic";

/** POST: Generate a new free-tier API key. */
export async function POST(req: Request) {
    try {
        let name = "unnamed";
        let ownerAddress: string | null = null;
        try {
            const body = await req.json();
            if (body.name) name = String(body.name).slice(0, 255);
            if (body.walletAddress) ownerAddress = String(body.walletAddress).slice(0, 42);
        } catch {
            // No body is fine
        }

        const rawKey = generateRawApiKey();
        const keyHash = hashApiKey(rawKey);

        const [inserted] = await db
            .insert(apiKeys)
            .values({
                keyHash,
                name,
                tier: "free",
                ownerAddress,
                dailyLimit: 50,
                lastResetDate: new Date().toISOString().slice(0, 10),
            })
            .returning({ id: apiKeys.id, tier: apiKeys.tier, dailyLimit: apiKeys.dailyLimit });

        return NextResponse.json({
            success: true,
            apiKey: rawKey,
            tier: inserted?.tier ?? "free",
            dailyLimit: inserted?.dailyLimit ?? 50,
            note: "Store this key securely — it will not be shown again.",
            usage: {
                header: `Authorization: Bearer ${rawKey}`,
                example: `curl -H "Authorization: Bearer ${rawKey}" https://future-express.vercel.app/api/v1/articles`,
            },
        });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

/** GET: Check key usage (requires the key in Authorization header). */
export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer fe_")) {
        return NextResponse.json({ error: "Provide your API key in the Authorization header" }, { status: 401 });
    }

    const rawKey = authHeader.slice(7);
    const keyHash = hashApiKey(rawKey);
    const [row] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));

    if (!row) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    return NextResponse.json({
        id: row.id,
        name: row.name,
        tier: row.tier,
        callsToday: row.callsToday,
        dailyLimit: row.dailyLimit,
        createdAt: row.createdAt?.toISOString(),
        lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    });
}

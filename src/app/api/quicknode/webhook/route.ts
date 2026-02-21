import { db } from "@/lib/db";
import { quicknodeStreams } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const payloads = await req.json();

        // QuickNode Streams usually sends an array of payloads
        const recordsToInsert = Array.isArray(payloads) ? payloads : [payloads];

        for (const payload of recordsToInsert) {
            // Basic extraction from common QuickNode stream wrappers
            const streamId = payload.streamId || "unknown";
            const network = payload.network || "hyperliquid";
            const dataset = payload.dataset || "blocks";

            await db.insert(quicknodeStreams).values({
                streamId,
                network,
                dataset,
                payload,
            });
        }

        return NextResponse.json({ success: true, inserted: recordsToInsert.length });
    } catch (error: any) {
        console.error("Error processing QuickNode webhook:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

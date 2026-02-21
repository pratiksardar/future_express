import { NextResponse } from "next/server";
import { getAgentBalance, AGENT_WALLET_ADDRESS } from "@/lib/cdp/client";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { eth, usdc, solvent } = await getAgentBalance();

        // Mock cost computing based on an arbitrary formula for demo stats
        const articlesGenerated = 145; // Can be a DB query
        const costPerArticle = 0.002;
        const totalCost = articlesGenerated * costPerArticle;

        return NextResponse.json({
            address: AGENT_WALLET_ADDRESS,
            eth,
            usdc,
            solvent,
            stats: {
                totalCost,
                incomeReceived: usdc + (eth * 3000), // very rough generic peg just for metric UI
                articlesGenerated
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

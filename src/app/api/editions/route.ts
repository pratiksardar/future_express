import { db } from "@/lib/db";
import { editions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** List all editions (volumes) for historical browsing, newest first. */
export async function GET() {
  try {
    const list = await db
      .select({
        id: editions.id,
        type: editions.type,
        date: editions.date,
        volumeNumber: editions.volumeNumber,
        publishedAt: editions.publishedAt,
      })
      .from(editions)
      .orderBy(desc(editions.publishedAt))
      .limit(100);
    return NextResponse.json({ editions: list });
  } catch (e) {
    console.error("Editions list error:", e);
    return NextResponse.json({ error: "Failed to list editions" }, { status: 500 });
  }
}

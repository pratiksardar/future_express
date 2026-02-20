import { db } from "@/lib/db";
import { editions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Returns the most recently published edition (for "Latest edition" on frontend). */
export async function GET() {
  try {
    const [latest] = await db
      .select()
      .from(editions)
      .orderBy(desc(editions.publishedAt))
      .limit(1);
    if (!latest) {
      return NextResponse.json({ edition: null });
    }
    return NextResponse.json({
      edition: {
        id: latest.id,
        type: latest.type,
        date: latest.date,
        volumeNumber: latest.volumeNumber,
        publishedAt: latest.publishedAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    console.error("Latest edition error:", e);
    return NextResponse.json({ error: "Failed to fetch latest edition" }, { status: 500 });
  }
}

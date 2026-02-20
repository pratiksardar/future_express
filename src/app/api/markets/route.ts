import { db } from "@/lib/db";
import { markets } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  let q = db
    .select()
    .from(markets)
    .where(eq(markets.status, "active"))
    .orderBy(desc(markets.volume24h))
    .limit(limit);

  if (
    category &&
    ["politics", "economy", "crypto", "sports", "science", "entertainment", "world"].includes(category)
  ) {
    q = db
      .select()
      .from(markets)
      .where(and(eq(markets.status, "active"), eq(markets.category, category as "politics" | "economy" | "crypto" | "sports" | "science" | "entertainment" | "world")))
      .orderBy(desc(markets.volume24h))
      .limit(limit);
  }

  const list = await q;
  return NextResponse.json(list);
}

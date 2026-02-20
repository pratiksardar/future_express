import { runIngestion } from "@/lib/ingestion";
import { generateMorningEdition } from "@/lib/articles/generate";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { generateArticles } = (typeof body === "object" && body !== null ? body : {}) as {
      generateArticles?: boolean;
    };

    const result = await runIngestion();
    if (generateArticles) {
      const gen = await generateMorningEdition();
      return NextResponse.json({ ingest: result, generateArticles: gen });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("Ingestion error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ingestion failed" },
      { status: 500 }
    );
  }
}

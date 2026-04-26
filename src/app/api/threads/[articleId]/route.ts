import { NextRequest, NextResponse } from "next/server";
import { generateThread } from "@/lib/articles/threads";

/**
 * GET /api/threads/[articleId] - Generate a Twitter thread for an article.
 * Returns pre-formatted tweets ready for copy-paste or scheduling.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const { articleId } = await params;

  if (!articleId || articleId.length < 10) {
    return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
  }

  const result = await generateThread(articleId);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Thread generation failed" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      articleId,
      thread: result.thread,
      // Pre-formatted thread text for easy copy-paste
      formatted: result.thread?.tweets
        .sort((a, b) => a.position - b.position)
        .map((t) => t.text)
        .join("\n\n---\n\n"),
    },
    { headers: { "Cache-Control": "s-maxage=3600" } }
  );
}

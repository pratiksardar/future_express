import { db } from "@/lib/db";
import { playcards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/playcards/[id]/image
 * Serves the playcard image from the database (stored as data URI in playcards.imageUrl).
 * Legacy: if only filePath is set, redirects to that static path.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await db
    .select({ imageUrl: playcards.imageUrl, filePath: playcards.filePath })
    .from(playcards)
    .where(eq(playcards.id, id))
    .limit(1);

  if (!row) {
    return new NextResponse(null, { status: 404 });
  }

  if (row.imageUrl?.startsWith("data:image/png;base64,")) {
    const base64 = row.imageUrl.slice("data:image/png;base64,".length);
    const buffer = Buffer.from(base64, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=86400",
      },
    });
  }

  if (row.filePath) {
    return NextResponse.redirect(new URL(row.filePath, _req.url), 302);
  }

  return new NextResponse(null, { status: 404 });
}

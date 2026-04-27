/**
 * POST /api/predictions/[id]/shared
 *
 * Marks a session-owned prediction as "I Called It"-shared. Idempotent.
 * Authorization: the caller must present the same `x-session-id` that owns
 * the prediction row. v1-no-auth posture: session id IS the credential.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

function readSessionId(req: NextRequest): string | null {
  const id = req.headers.get("x-session-id");
  if (!id || typeof id !== "string") return null;
  if (id.length < 8 || id.length > 128) return null;
  return id;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessionId = readSessionId(req);
  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing x-session-id header" },
      { status: 400 },
    );
  }

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const updated = await db
    .update(predictions)
    .set({ iCalledItShared: true })
    .where(and(eq(predictions.id, id), eq(predictions.sessionId, sessionId)))
    .returning({ id: predictions.id });

  if (updated.length === 0) {
    return NextResponse.json(
      { error: "Prediction not found for this session" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, id: updated[0].id });
}

/**
 * POST /api/digest/preview
 *
 * Admin-only endpoint. Renders the current digest payload as HTML and returns
 * it inline so we can sanity-check the template before a real send.
 *
 * Auth: header `x-admin-key` must match `ADMIN_KEY` env var. If `ADMIN_KEY`
 * is unset the endpoint always returns 401 — no accidental open access.
 */
import { NextRequest, NextResponse } from "next/server";
import { buildDigestContent, renderDigestHtml } from "@/lib/email/send";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { error: "ADMIN_KEY not configured." },
      { status: 401 }
    );
  }

  const provided = req.headers.get("x-admin-key");
  if (provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const content = await buildDigestContent();
    const { html, subject } = await renderDigestHtml(content);

    const url = new URL(req.url);
    const wantsJson = url.searchParams.get("format") === "json";

    if (wantsJson) {
      return NextResponse.json({ subject, html, content });
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Digest-Subject": subject,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/digest/preview]", err);
    return NextResponse.json(
      { error: "Failed to render digest", details: message },
      { status: 500 }
    );
  }
}

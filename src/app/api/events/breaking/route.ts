import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type BreakingArticle = {
  articleId: string;
  headline: string;
  slug: string;
  probability: number;
};

// Module-level set of active SSE controllers.
const controllers = new Set<ReadableStreamDefaultController>();

/**
 * Called by Inngest functions when a breaking article is published.
 * Fans out a `breaking` event to every connected client.
 */
export function broadcastBreaking(article: BreakingArticle): void {
  const payload = JSON.stringify({ type: "breaking", ...article });
  const chunk = `data: ${payload}\n\n`;
  for (const ctrl of controllers) {
    try {
      ctrl.enqueue(chunk);
    } catch {
      // Client already disconnected — will be cleaned up on its own close.
    }
  }
}

export async function GET(req: NextRequest) {
  let pingInterval: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(ctrl) {
      controllers.add(ctrl);

      // Send an initial comment so the browser knows the connection is alive.
      ctrl.enqueue(": connected\n\n");

      // Keep-alive ping every 30 seconds.
      pingInterval = setInterval(() => {
        try {
          ctrl.enqueue(": ping\n\n");
        } catch {
          clearInterval(pingInterval);
        }
      }, 30_000);

      // Clean up when the client disconnects.
      req.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        controllers.delete(ctrl);
        try {
          ctrl.close();
        } catch {
          // Already closed.
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

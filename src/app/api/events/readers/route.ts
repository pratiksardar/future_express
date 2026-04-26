import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// articleId → current reader count
const counts = new Map<string, number>();

// articleId → set of controllers subscribed to that article's count
const subscribers = new Map<string, Set<ReadableStreamDefaultController>>();

function getCount(articleId: string): number {
  return counts.get(articleId) ?? 0;
}

function increment(articleId: string): number {
  const next = getCount(articleId) + 1;
  counts.set(articleId, next);
  return next;
}

function decrement(articleId: string): number {
  const next = Math.max(0, getCount(articleId) - 1);
  if (next === 0) {
    counts.delete(articleId);
  } else {
    counts.set(articleId, next);
  }
  return next;
}

function broadcast(articleId: string, count: number): void {
  const subs = subscribers.get(articleId);
  if (!subs) return;
  const chunk = `data: ${count}\n\n`;
  for (const ctrl of subs) {
    try {
      ctrl.enqueue(chunk);
    } catch {
      // Disconnected — cleaned up on abort.
    }
  }
}

function addSubscriber(articleId: string, ctrl: ReadableStreamDefaultController): void {
  if (!subscribers.has(articleId)) {
    subscribers.set(articleId, new Set());
  }
  subscribers.get(articleId)!.add(ctrl);
}

function removeSubscriber(articleId: string, ctrl: ReadableStreamDefaultController): void {
  const subs = subscribers.get(articleId);
  if (!subs) return;
  subs.delete(ctrl);
  if (subs.size === 0) {
    subscribers.delete(articleId);
  }
}

export async function GET(req: NextRequest) {
  const articleId = new URL(req.url).searchParams.get("articleId") ?? "";

  let pingInterval: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(ctrl) {
      addSubscriber(articleId, ctrl);

      const count = increment(articleId);

      // Emit the current count immediately to this new subscriber.
      ctrl.enqueue(`data: ${count}\n\n`);

      // Broadcast updated count to everyone else on this article.
      broadcast(articleId, count);

      // Keep-alive ping every 30 seconds.
      pingInterval = setInterval(() => {
        try {
          ctrl.enqueue(": ping\n\n");
        } catch {
          clearInterval(pingInterval);
        }
      }, 30_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        removeSubscriber(articleId, ctrl);

        const updated = decrement(articleId);
        // Broadcast the reduced count to remaining subscribers.
        broadcast(articleId, updated);

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

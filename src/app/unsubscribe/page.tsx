/**
 * /unsubscribe?token=...
 *
 * Server-rendered confirmation page. We hit /api/unsubscribe ourselves so the
 * link in the email works in clients that don't run JavaScript (Outlook
 * desktop, terminal mail readers, etc.).
 */
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const params = await searchParams;
  const token = params.token;

  let state: "ok" | "invalid" | "error" = "ok";

  if (!token || !UUID_RE.test(token)) {
    state = "invalid";
  } else {
    try {
      await db
        .update(subscribers)
        .set({ status: "unsubscribed" })
        .where(eq(subscribers.unsubscribeToken, token));
    } catch (err) {
      console.error("[unsubscribe page]", err);
      state = "error";
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-paper-cream)] flex items-center justify-center px-6 py-16">
      <section className="max-w-xl text-center border border-[var(--color-rule)] bg-[var(--color-paper)] p-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent-red)] font-bold mb-3">
          The Future Express
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-[var(--color-ink)] leading-tight mb-4">
          {state === "ok"
            ? "You have been removed from the dispatch list."
            : state === "invalid"
              ? "This unsubscribe link is invalid."
              : "Something went wrong."}
        </h1>
        <p className="font-[family-name:var(--font-sub)] italic text-[var(--color-ink-medium)] mb-6">
          {state === "ok"
            ? "We shall trouble your inbox no further. If this was an error, you may resubscribe at any time from our front page."
            : state === "invalid"
              ? "The token in this link is missing or malformed. If you continue to receive emails in error, please reply to one and our editor shall attend to it."
              : "Our presses are momentarily jammed. Try again in a few minutes."}
        </p>
        <a
          href="/"
          className="inline-block px-6 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold uppercase tracking-wider text-sm hover:bg-[var(--color-accent-blue)] transition-colors"
        >
          Return to the front page
        </a>
      </section>
    </main>
  );
}

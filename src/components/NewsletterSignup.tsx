"use client";

import { useState } from "react";

/**
 * Newsletter signup form.
 *
 * Posts to our own /api/subscribe (Resend-backed daily digest). The browser
 * detects its own IANA timezone via Intl so the cron can deliver locally at
 * 7AM. We do NOT prompt the user for a TZ — the inferred one is correct
 * 99% of the time.
 *
 * Referral attribution: when present we forward
 *   - `referredByCode` from `?ref=` query param (or fall back to the
 *     `tfe_ref` cookie which middleware sets server-side).
 *   - `sessionId` from the `tfe_session_id` localStorage entry that
 *     other surfaces (DailyChallenge, LiveReaderCount) write to.
 */
export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMessage(null);

    try {
      const timezone =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC";

      // Read ref code from URL first (recently-clicked link), fallback to
      // the tfe_ref cookie (set by middleware on first visit).
      const referredByCode = (() => {
        if (typeof window === "undefined") return null;
        const fromUrl = new URL(window.location.href).searchParams.get("ref");
        if (fromUrl) return fromUrl;
        const m = document.cookie.match(/(?:^|;\s*)tfe_ref=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : null;
      })();

      const sessionId = (() => {
        if (typeof window === "undefined") return null;
        try {
          return window.localStorage.getItem("tfe_session_id");
        } catch {
          return null;
        }
      })();

      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          timezone,
          ...(referredByCode ? { referredByCode } : {}),
          ...(sessionId ? { sessionId } : {}),
        }),
      });

      if (res.ok) {
        setStatus("done");
        return;
      }

      let message = "Something went wrong. Try again.";
      try {
        const data = (await res.json()) as { error?: string };
        if (data?.error) message = data.error;
      } catch {
        // ignore — keep default message
      }
      setErrorMessage(message);
      setStatus("error");
    } catch {
      setErrorMessage("Network error — please try again.");
      setStatus("error");
    }
  };

  return (
    <section className="py-8 border-t border-[var(--color-rule)]">
      <h2 className="section-title mb-2">Subscribe to the Express</h2>
      <p className="text-sm text-[var(--color-ink-medium)] mb-4 font-[family-name:var(--font-sub)] italic">
        The morrow&apos;s intelligence, delivered to your inbox at 7 of the morning, your local time.
      </p>
      {status === "done" ? (
        <p className="text-sm text-[var(--color-spot-green)] font-[family-name:var(--font-sub)] italic">
          Welcome aboard. The next dispatch shall arrive at dawn.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-wrap gap-2 max-w-md">
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email address"
            className="flex-1 min-w-[200px] px-4 py-2 border border-[var(--color-rule)] bg-[var(--color-paper-cream)] text-[var(--color-ink)] font-[family-name:var(--font-body)]"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-6 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold uppercase tracking-wider text-sm font-[family-name:var(--font-ui)] hover:bg-[var(--color-accent-blue)] transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "Sending…" : "Subscribe"}
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="text-sm text-[var(--color-spot-red)] mt-2">
          {errorMessage ?? "Something went wrong. Try again."}
        </p>
      )}
    </section>
  );
}

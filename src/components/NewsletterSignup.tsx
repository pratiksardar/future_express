"use client";

import { useState } from "react";

const SUBSTACK_URL = process.env.NEXT_PUBLIC_SUBSTACK_URL ?? "https://substack.com";
const BEEHIIV_URL = process.env.NEXT_PUBLIC_BEEHIIV_URL ?? "";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const actionUrl = BEEHIIV_URL || `${SUBSTACK_URL}/api/v1/free`;
  const isSubstack = !BEEHIIV_URL;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      if (isSubstack) {
        window.open(`${SUBSTACK_URL}/subscribe?email=${encodeURIComponent(email)}`, "_blank");
        setStatus("done");
      } else {
        const res = await fetch(actionUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        setStatus(res.ok ? "done" : "error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="py-8 border-t border-[var(--color-rule)]">
      <h2 className="section-title mb-2">
        Subscribe to the Express
      </h2>
      <p className="text-sm text-[var(--color-ink-medium)] mb-4 font-[family-name:var(--font-sub)] italic">
        Receive the morrow&apos;s intelligence and exclusive predictions.
      </p>
      <form onSubmit={submit} className="flex flex-wrap gap-2 max-w-md">
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-[var(--color-rule)] bg-[var(--color-paper-cream)] text-[var(--color-ink)] font-[family-name:var(--font-body)]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-6 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold uppercase tracking-wider text-sm font-[family-name:var(--font-ui)] hover:bg-[var(--color-accent-blue)] transition-colors disabled:opacity-60"
        >
          {status === "loading" ? "…" : status === "done" ? "Done" : "Subscribe"}
        </button>
      </form>
      {status === "done" && (
        <p className="text-sm text-[var(--color-spot-green)] mt-2">Check your inbox to confirm.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-[var(--color-spot-red)] mt-2">Something went wrong. Try again.</p>
      )}
    </section>
  );
}

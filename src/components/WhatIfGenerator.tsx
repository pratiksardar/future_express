"use client";

import { useState, useRef, useCallback } from "react";

export type WhatIfMarket = {
  id: string;
  title: string;
  currentProbability: number;
};

export function WhatIfGenerator({ market }: { market: WhatIfMarket }) {
  const [scenario, setScenario] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const remaining = 200 - scenario.length;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = scenario.trim();
      if (!trimmed || status === "loading") return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setStatus("loading");
      setOutput("");
      setErrorMsg("");

      try {
        const res = await fetch("/api/whatif", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marketId: market.id, scenario: trimmed }),
          signal: ctrl.signal,
        });

        // SSE reading via text/event-stream
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let parsed: { text?: string; done?: boolean; error?: string };
            try {
              parsed = JSON.parse(raw);
            } catch {
              continue;
            }

            if (parsed.error) {
              setErrorMsg(parsed.error);
              setStatus("error");
              return;
            }
            if (parsed.done) {
              setStatus("done");
              return;
            }
            if (parsed.text) {
              setOutput((prev) => prev + parsed.text);
            }
          }
        }

        setStatus("done");
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setErrorMsg("Something went wrong. Please try again.");
        setStatus("error");
      }
    },
    [scenario, status, market.id]
  );

  return (
    <div
      className="mt-8 border-2 border-[var(--color-rule-dark)] bg-[var(--color-paper-cream)]"
      style={{ fontFamily: "var(--font-body, Georgia, serif)" }}
    >
      {/* Header */}
      <div className="border-b-2 border-[var(--color-rule-dark)] px-5 py-3 flex items-center justify-between">
        <div>
          <span
            className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-ink-light)]"
            style={{ fontFamily: "var(--font-ui, sans-serif)" }}
          >
            Special Feature
          </span>
          <h3
            className="text-xl font-bold text-[var(--color-ink)] mt-0.5"
            style={{ fontFamily: "var(--font-display, Georgia, serif)" }}
          >
            What If?
          </h3>
        </div>
        <span
          className="text-[9px] uppercase tracking-widest text-[var(--color-ink-light)] border border-[var(--color-rule)] px-2 py-1"
          style={{ fontFamily: "var(--font-ui, sans-serif)" }}
        >
          AI Analysis
        </span>
      </div>

      {/* Form */}
      <div className="px-5 py-4">
        <p
          className="text-sm text-[var(--color-ink-medium)] mb-3 italic"
          style={{ fontFamily: "var(--font-sub, Georgia, serif)" }}
        >
          Explore an alternative future for:{" "}
          <strong className="not-italic text-[var(--color-ink)]">{market.title}</strong>
          {" "}
          <span className="text-[var(--color-ink-light)]">
            (currently {market.currentProbability}%)
          </span>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-0">
            <span
              className="inline-flex items-center px-3 border border-r-0 border-[var(--color-rule-dark)] bg-[var(--color-paper-warm)] text-[var(--color-ink-light)] text-sm select-none"
              style={{ fontFamily: "var(--font-ui, sans-serif)" }}
            >
              What if...
            </span>
            <input
              type="text"
              value={scenario}
              onChange={(e) => setScenario(e.target.value.slice(0, 200))}
              placeholder="...the election is postponed?"
              disabled={status === "loading"}
              className="flex-1 px-3 py-2 border border-[var(--color-rule-dark)] bg-[var(--color-paper)] text-[var(--color-ink)] text-sm placeholder:text-[var(--color-ink-faded)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-blue)] disabled:opacity-60"
              style={{ fontFamily: "var(--font-body, Georgia, serif)" }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span
              className="text-[10px] text-[var(--color-ink-faded)]"
              style={{ fontFamily: "var(--font-ui, sans-serif)" }}
            >
              {remaining} characters remaining · 3 scenarios per hour
            </span>
            <button
              type="submit"
              disabled={status === "loading" || !scenario.trim()}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-accent-blue)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ fontFamily: "var(--font-ui, sans-serif)" }}
            >
              {status === "loading" ? (
                <span className="flex items-center gap-1.5">
                  <LoadingDots />
                  Printing...
                </span>
              ) : (
                "Explore Scenario"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Output area */}
      {(status === "loading" || status === "done" || (status === "error" && errorMsg)) && (
        <div className="border-t-2 border-[var(--color-rule-dark)] px-5 py-4 relative">
          {/* Watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
            aria-hidden="true"
          >
            <span
              className="text-[11px] font-bold uppercase tracking-[0.35em] text-[var(--color-rule-dark)] opacity-20 rotate-[-30deg] whitespace-nowrap"
              style={{ fontFamily: "var(--font-ui, sans-serif)" }}
            >
              HYPOTHETICAL SCENARIO
            </span>
          </div>

          {status === "error" ? (
            <p
              className="text-sm text-[var(--color-spot-red)] italic"
              style={{ fontFamily: "var(--font-sub, Georgia, serif)" }}
            >
              {errorMsg}
            </p>
          ) : (
            <div
              className="relative text-[var(--color-ink-medium)] leading-[1.7] text-base text-justify [&>p]:mb-4 [&>p:last-child]:mb-0"
              style={{ fontFamily: "var(--font-body, Georgia, serif)" }}
            >
              {output
                .split(/\n\n+/)
                .filter(Boolean)
                .map((para, i) => (
                  <p key={i}>{para.replace(/\n/g, " ")}</p>
                ))}
              {/* Typewriter cursor while streaming */}
              {status === "loading" && (
                <span className="inline-block w-[2px] h-[1em] bg-[var(--color-ink)] animate-pulse align-middle ml-0.5" />
              )}
            </div>
          )}

          {status === "done" && output && (
            <p
              className="mt-4 text-[9px] uppercase tracking-[0.15em] text-[var(--color-ink-faded)] border-t border-[var(--color-rule)] pt-2"
              style={{ fontFamily: "var(--font-ui, sans-serif)" }}
            >
              AI-generated hypothetical analysis. Not a prediction or financial advice.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="flex gap-[3px] items-center">
      <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
      <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
      <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

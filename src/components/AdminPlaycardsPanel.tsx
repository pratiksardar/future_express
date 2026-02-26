"use client";

import { useCallback, useEffect, useState } from "react";

const SEQUENCE = "xyzzy";
const SEQ_LEN = 5;

type PlaycardItem = {
  id: string;
  articleId: string;
  headline: string;
  slug: string;
  createdAt?: string;
  imageUrl: string;
};

export function AdminPlaycardsPanel() {
  const [visible, setVisible] = useState(false);
  const [playcards, setPlaycards] = useState<PlaycardItem[]>([]);
  const [volumeNumber, setVolumeNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaycards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/playcards");
      if (!res.ok) throw new Error("Failed to load playcards");
      const data = await res.json();
      setPlaycards(data.playcards ?? []);
      setVolumeNumber(data.volumeNumber ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let buffer: string[] = [];

    function onKeyDown(ev: KeyboardEvent) {
      const key = ev.key.toLowerCase();
      if (key.length !== 1) return;
      buffer.push(key);
      if (buffer.length > SEQ_LEN) buffer.shift();
      if (buffer.join("") === SEQUENCE) {
        setVisible((v) => {
          const next = !v;
          if (next) fetchPlaycards();
          return next;
        });
        buffer = [];
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fetchPlaycards]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-label="Admin playcards"
      onClick={(e) => e.target === e.currentTarget && setVisible(false)}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-[var(--color-paper)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] px-4 py-3">
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Social playcards — download for Twitter & social
            {volumeNumber != null && (
              <span className="ml-2 font-normal text-[var(--color-ink-light)]">
                (Volume {volumeNumber})
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded px-3 py-1.5 text-sm font-medium text-[var(--color-ink-light)] hover:bg-[var(--color-paper-warm)] hover:text-[var(--color-ink)]"
          >
            Close
          </button>
        </div>
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-4">
          {loading && (
            <p className="py-8 text-center text-[var(--color-ink-light)]">
              Loading…
            </p>
          )}
          {error && (
            <p className="py-4 text-center text-[var(--color-spot-red)]">
              {error}
            </p>
          )}
          {!loading && !error && playcards.length === 0 && (
            <p className="py-8 text-center text-[var(--color-ink-light)]">
              No playcards yet. Run an edition to generate them.
            </p>
          )}
          {!loading && playcards.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {playcards.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded border border-[var(--color-rule)] bg-[var(--color-paper-warm)]"
                >
                  <a
                    href={p.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.headline}
                      className="h-40 w-full object-cover"
                    />
                  </a>
                  <div className="flex flex-1 flex-col justify-between p-3">
                    <p
                      className="line-clamp-2 text-sm font-medium text-[var(--color-ink)]"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {p.headline}
                    </p>
                    <a
                      href={p.imageUrl}
                      download={`playcard-${p.slug}.png`}
                      className="mt-2 inline-block w-fit rounded bg-[var(--color-accent-blue)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

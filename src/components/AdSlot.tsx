"use client";

import { useEffect, useRef } from "react";

/**
 * Placeholder for crypto ad networks (Coinzilla, Bitmedia).
 * Set NEXT_PUBLIC_AD_SLOT_ID to enable. Style with retro newspaper look.
 */
export function AdSlot() {
  const ref = useRef<HTMLDivElement>(null);
  const slotId = process.env.NEXT_PUBLIC_AD_SLOT_ID;

  useEffect(() => {
    if (!slotId || !ref.current) return;
    // Integrate with Coinzilla/Bitmedia script here when ready
    // e.g. window.coinzilla_run = ...
  }, [slotId]);

  if (!slotId) {
    return (
      <div className="py-4 px-4 border border-[var(--color-rule)] bg-[var(--color-paper-warm)] text-center text-[10px] uppercase tracking-wider text-[var(--color-ink-faded)] font-[family-name:var(--font-ui)]">
        Advertisement
      </div>
    );
  }

  return (
    <div ref={ref} className="py-4 px-4 border border-[var(--color-rule)] bg-[var(--color-paper-warm)] min-h-[90px]" />
  );
}

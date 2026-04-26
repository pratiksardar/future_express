"use client";

import { useEffect, useState } from "react";

/**
 * 6-frame ASCII print-press / wire-dispatch animation.
 * Frames suggest paper feeding through the press; subtle, no jitter.
 *
 * Polish-pass timing: 200ms / frame → 1200ms full cycle.
 * The original 133ms (800ms cycle) flickered next to the masthead and
 * pulled the eye away from the wordmark. 1.2s reads as a deliberate
 * mechanical loop without competing with the headline.
 *
 * Pause-on-hover so curious users can read the frames; respects
 * prefers-reduced-motion (frame 0 only, no interval).
 */
const FRAMES: string[] = [
  ` ┌────┐\n │░   │\n │    │\n └────┘`,
  ` ┌────┐\n │▒░  │\n │    │\n └────┘`,
  ` ┌────┐\n │█▒░ │\n │░   │\n └────┘`,
  ` ┌────┐\n │ █▒░│\n │░░  │\n └────┘`,
  ` ┌────┐\n │  █▒│\n │▒░░ │\n └────┘`,
  ` ┌────┐\n │   █│\n │█▒░ │\n └────┘`,
];

export default function PressOrnament() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return;
    if (paused) return;
    const t = window.setInterval(() => {
      setI((n) => (n + 1) % FRAMES.length);
    }, 200);
    return () => window.clearInterval(t);
  }, [paused]);

  return (
    <pre
      className="v4-press-pre"
      aria-hidden="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {FRAMES[i]}
    </pre>
  );
}

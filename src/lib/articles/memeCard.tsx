/**
 * Meme-style probability shift cards.
 * Generated when a market moves >20% in 24 hours.
 * Uses next/og ImageResponse (same pattern as playcard.tsx).
 */

import { ImageResponse } from "next/og";

export type MemeCardPayload = {
  marketTitle: string;
  oldProbability: number;
  newProbability: number;
  topText: string;
  bottomText: string;
  category?: string;
};

const C = {
  ink: "#1d1f23",
  paper: "#f6f3ec",
  accent: "#1b3a5c",
  gold: "#c8a74a",
  red: "#c0392b",
  green: "#1a6b3c",
  white: "#ffffff",
} as const;

function MemeCard({ payload }: { payload: MemeCardPayload }) {
  const shift = payload.newProbability - payload.oldProbability;
  const isUp = shift > 0;
  const shiftColor = isUp ? C.green : C.red;
  const arrow = isUp ? "▲" : "▼";

  return (
    <div
      style={{
        width: 1200,
        height: 675,
        display: "flex",
        flexDirection: "column",
        backgroundColor: C.paper,
        color: C.ink,
        fontFamily: "Georgia, 'Times New Roman', serif",
        overflow: "hidden",
      }}
    >
      {/* Gold top bar */}
      <div style={{ width: "100%", height: 6, backgroundColor: C.gold, flexShrink: 0 }} />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 48px",
          borderBottom: `3px solid ${C.ink}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            THE FUTURE EXPRESS
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.red }}>
            ODDS ALERT
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: shiftColor,
            color: C.white,
            padding: "10px 20px",
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: "0.08em",
          }}
        >
          {arrow} {isUp ? "+" : ""}{shift.toFixed(0)}%
        </div>
      </div>

      {/* Top text */}
      <div
        style={{
          padding: "24px 48px 12px",
          fontSize: 28,
          fontWeight: 700,
          fontStyle: "italic",
          color: C.ink,
          lineHeight: 1.3,
          flexShrink: 0,
        }}
      >
        {payload.topText}
      </div>

      {/* Center: Old vs New probability */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          padding: "0 48px",
        }}
      >
        {/* Old probability */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", marginBottom: 8 }}>
            BEFORE
          </span>
          <span
            style={{
              fontSize: 120,
              fontWeight: 900,
              lineHeight: 1,
              color: "#bbb",
              textDecoration: "line-through",
              textDecorationColor: C.red,
              textDecorationThickness: 6,
            }}
          >
            {payload.oldProbability}%
          </span>
        </div>

        {/* Arrow */}
        <span style={{ fontSize: 80, color: shiftColor, fontWeight: 900 }}>→</span>

        {/* New probability */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: shiftColor, marginBottom: 8 }}>
            NOW
          </span>
          <span
            style={{
              fontSize: 120,
              fontWeight: 900,
              lineHeight: 1,
              color: shiftColor,
            }}
          >
            {payload.newProbability}%
          </span>
        </div>
      </div>

      {/* Bottom text */}
      <div
        style={{
          padding: "12px 48px 20px",
          fontSize: 24,
          fontWeight: 700,
          fontStyle: "italic",
          color: C.ink,
          lineHeight: 1.3,
          flexShrink: 0,
        }}
      >
        {payload.bottomText}
      </div>

      {/* Market title bar */}
      <div
        style={{
          width: "100%",
          backgroundColor: C.accent,
          padding: "16px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: C.white,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, maxWidth: 700, overflow: "hidden" }}>
          {payload.marketTitle.length > 80 ? payload.marketTitle.slice(0, 77) + "..." : payload.marketTitle}
        </span>
        <span style={{ fontSize: 15, fontWeight: 900, color: C.gold }}>
          ↗ thefutureexpress.com
        </span>
      </div>
    </div>
  );
}

export async function generateMemeCardResponse(
  payload: MemeCardPayload
): Promise<Response> {
  return new ImageResponse(<MemeCard payload={payload} />, {
    width: 1200,
    height: 675,
  });
}

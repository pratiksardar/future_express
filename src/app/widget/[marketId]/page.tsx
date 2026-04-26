import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { markets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

/**
 * SURFACE: embed widget — terminal-only, no broadsheet typography.
 *
 * Per docs/v4-cmo-review.md §4 (Cross-surface scalability), the embed
 * widget is a *citation-format object*, not a brand-impression object.
 * Strip the cartouche, the wordmark, and the wallet receipt — keep only
 * the ASCII odds frame and a small attribution footer. This makes the
 * widget travel cleanly into Marginal Revolution, Stratechery, finance
 * blogs, and any third-party site whose own design grammar isn't
 * 1925-broadsheet.
 *
 * Iframe target size: 300×200. The ASCII box is 31 chars wide and
 * renders cleanly at 11px JetBrains Mono in a 300px container.
 */

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ marketId: string }>;
}): Promise<Metadata> {
  const { marketId } = await params;
  const [market] = await db
    .select({ title: markets.title })
    .from(markets)
    .where(eq(markets.id, marketId))
    .limit(1);

  if (!market) return { title: "Market Not Found" };

  return {
    title: `${market.title} — The Future Express`,
    robots: { index: false },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function probLabel(p: number): string {
  if (p >= 90) return "Near Certain";
  if (p >= 70) return "Very Likely";
  if (p >= 50) return "Leaning Yes";
  if (p >= 40) return "Toss-Up";
  if (p >= 20) return "Leaning No";
  if (p >= 5) return "Unlikely";
  return "Long Shot";
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function buildBar(pct: number, width = 20): string {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return "━".repeat(filled) + "░".repeat(Math.max(0, width - filled));
}

function pad(s: string, w: number): string {
  if (s.length >= w) return s.slice(0, w);
  return s + " ".repeat(w - s.length);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;

  const [market] = await db
    .select({
      id: markets.id,
      title: markets.title,
      currentProbability: markets.currentProbability,
      polymarketSlug: markets.polymarketSlug,
      kalshiEventTicker: markets.kalshiEventTicker,
      updatedAt: markets.updatedAt,
    })
    .from(markets)
    .where(eq(markets.id, marketId))
    .limit(1);

  if (!market) notFound();

  const prob = market.currentProbability
    ? Math.round(parseFloat(String(market.currentProbability)))
    : 50;

  const hasPolymarket = Boolean(market.polymarketSlug);
  const hasKalshi = Boolean(market.kalshiEventTicker);
  const sourceBadge =
    hasPolymarket && hasKalshi
      ? "POLYMARKET · KALSHI"
      : hasPolymarket
      ? "POLYMARKET"
      : hasKalshi
      ? "KALSHI"
      : "PREDICTION MKT";

  const tradeUrl = hasPolymarket
    ? `https://polymarket.com/event/${market.polymarketSlug}`
    : hasKalshi
    ? `https://kalshi.com/markets/${market.kalshiEventTicker}`
    : "https://polymarket.com";

  const label = probLabel(prob);
  const appUrl = getAppUrl();

  // ASCII odds box — 27 cols inner width to fit in a 300px iframe at 11px mono.
  const titleLine = truncate(market.title.toUpperCase(), 25);
  const probStr = String(Math.max(0, Math.min(99, prob))).padStart(2, " ");
  const oddsBox = [
    "┌── MARKET ODDS ─────────────┐",
    "│                            │",
    `│  ${probStr}%   ${pad(label.toUpperCase(), 18)}│`,
    `│  ${buildBar(prob)}      │`,
    "│                            │",
    `│  ${pad(titleLine, 26)}│`,
    `│  ${pad(sourceBadge, 26)}│`,
    "└────────────────────────────┘",
  ];

  return (
    <div
      style={{
        width: "300px",
        height: "200px",
        display: "flex",
        flexDirection: "column",
        background: "#f3ede0",
        color: "#1a1714",
        fontFamily: "var(--font-data), ui-monospace, 'JetBrains Mono', 'Courier New', monospace",
        fontFeatureSettings: '"liga" 0, "calt" 0, "dlig" 0',
        overflow: "hidden",
        padding: "8px 10px 6px",
        boxSizing: "border-box",
        border: "1px solid #1a1714",
      }}
    >
      <pre
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "inherit",
          fontSize: "11px",
          lineHeight: 1.32,
          whiteSpace: "pre",
          color: "#1a1714",
          flex: 1,
          fontVariantNumeric: "tabular-nums lining-nums",
        }}
      >
        {oddsBox.join("\n")}
      </pre>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "9px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginTop: "4px",
          paddingTop: "4px",
          borderTop: "1px dashed #8b7e6e",
        }}
      >
        <a
          href={tradeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#1a1714",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ► TRADE
        </a>
        <a
          href={appUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#6b6356",
            textDecoration: "none",
          }}
        >
          Powered by The Future Express ↗
        </a>
      </div>
    </div>
  );
}

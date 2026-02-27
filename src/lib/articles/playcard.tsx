/**
 * Social playcard image generator — premium newspaper editorial style.
 * Uses next/og ImageResponse.
 */

import { ImageResponse } from "next/og";

export type PlaycardFormat = "twitter" | "instagram" | "portrait";
export type CTAVariant = "A" | "B" | "C";

export type PlaycardPayload = {
  headline: string;
  subheadline?: string | null;
  bodyExcerpt?: string | null;
  imageUrl?: string | null;
  slug: string;
  category?: string;
  publishedAt?: string;
  volumeNumber?: number | null;
  issueNumber?: number | null;
  probability?: number | null;
  format?: PlaycardFormat;
  ctaVariant?: CTAVariant;
};

const DIMS: Record<PlaycardFormat, { w: number; h: number }> = {
  twitter: { w: 1200, h: 675 },
  instagram: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
};

const C = {
  ink: "#1d1f23",
  inkSoft: "#3f434a",
  inkLight: "#6b7078",
  paper: "#f6f3ec",
  paperLine: "#e4dfd4",
  accent: "#1b3a5c",
  gold: "#c8a74a",
  red: "#c0392b",
  white: "#ffffff",
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  politics: "Politics",
  economy: "Economy & Markets",
  crypto: "Crypto",
  sports: "Sports",
  science: "Science",
  entertainment: "Entertainment",
  world: "World",
};

const CATEGORY_ACCENT: Record<string, string> = {
  politics: "#c0392b",
  economy: "#1b3a5c",
  crypto: "#7b2d8b",
  sports: "#1a6b3c",
  science: "#0d5c8a",
  entertainment: "#b5430a",
  world: "#2c4a1e",
};

const PAPER_NAME = "THE FUTURE EXPRESS";
const TAGLINE = "Tomorrow's News · Today's Odds";
const CTA_DOMAIN = "future-express.vercel.app";
const WINNER_CTA_VARIANT: CTAVariant = "C";
const CTA_TEST_MODE = process.env.PLAYCARD_CTA_MODE === "test";
const CTA_VARIANTS: Record<CTAVariant, string> = {
  A: "See Why Markets Moved",
  B: "Get the Full Odds Breakdown",
  C: "What Happens Next?",
};

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function truncWordBoundary(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace <= Math.floor(max * 0.55)) return `${cut}…`;
  return `${cut.slice(0, lastSpace)}…`;
}

function probLabel(probability: number): string {
  if (probability >= 80) return "Very Likely";
  if (probability >= 60) return "Likely";
  if (probability >= 40) return "Uncertain";
  if (probability >= 20) return "Unlikely";
  return "Very Unlikely";
}

export function resolveCtaVariant(payload: Pick<PlaycardPayload, "slug" | "headline" | "ctaVariant">): CTAVariant {
  if (payload.ctaVariant) return payload.ctaVariant;
  if (!CTA_TEST_MODE) return WINNER_CTA_VARIANT;
  const variants: CTAVariant[] = ["A", "B", "C"];
  return variants[stableHash(payload.slug || payload.headline) % variants.length];
}

function resolveCtaText(payload: Pick<PlaycardPayload, "slug" | "headline" | "ctaVariant">): string {
  return CTA_VARIANTS[resolveCtaVariant(payload)];
}

function scaleFor(format: PlaycardFormat) {
  if (format === "twitter") {
    return { headline: 68, dek: 35, body: 28, meta: 15, padX: 56, padY: 36, headlineMax: 95, bodyMax: 220 };
  }
  if (format === "instagram") {
    return { headline: 72, dek: 30, body: 25, meta: 14, padX: 48, padY: 34, headlineMax: 120, bodyMax: 360 };
  }
  return { headline: 76, dek: 30, body: 25, meta: 13, padX: 48, padY: 32, headlineMax: 140, bodyMax: 500 };
}

function EditorialCard({
  payload,
  format,
}: {
  payload: PlaycardPayload;
  format: PlaycardFormat;
}) {
  const { w, h } = DIMS[format];
  const scale = scaleFor(format);
  const ctaPrimary = resolveCtaText(payload);
  const categoryLabel = (payload.category && CATEGORY_LABELS[payload.category]) || payload.category || "";
  const categoryAccent = (payload.category && CATEGORY_ACCENT[payload.category]) || C.red;

  const headline = truncWordBoundary(payload.headline, scale.headlineMax);
  const dekSource = payload.subheadline || payload.bodyExcerpt || "";
  const dek = truncWordBoundary(dekSource, format === "twitter" ? 150 : 190);
  const bodySource = payload.bodyExcerpt || payload.subheadline || "";
  const body = truncWordBoundary(bodySource, scale.bodyMax);
  const bodyFontSize = payload.bodyExcerpt ? scale.dek : scale.body;
  const volumeNumber = payload.volumeNumber ?? 1;
  const issueNumber = payload.issueNumber ?? 1;
  const dropCap = body ? body.charAt(0) : "";
  const bodyRest = body ? body.slice(1) : "";

  return (
    <div
      style={{
        width: w,
        height: h,
        display: "flex",
        flexDirection: "column",
        backgroundColor: C.paper,
        color: C.ink,
        fontFamily: "Georgia, 'Times New Roman', serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: 6,
          background: `linear-gradient(90deg, ${C.gold} 0%, #e1c574 50%, ${C.gold} 100%)`,
          flexShrink: 0,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: `12px ${scale.padX}px 10px ${scale.padX}px`,
          borderBottom: `2px solid ${C.ink}`,
          backgroundColor: C.paper,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            border: `3px solid ${C.ink}`,
            padding: 3,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              border: `1px solid ${C.ink}`,
              padding: "8px 14px 10px 14px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: `2px solid ${C.ink}`,
                paddingBottom: 7,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: C.inkLight, textTransform: "uppercase" }}>
                {payload.publishedAt ?? ""}
              </span>
              <span style={{ fontSize: 11, letterSpacing: "0.08em", color: C.inkLight, fontStyle: "italic" }}>
                The Independent Intelligence of the Future
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: C.inkLight, textTransform: "uppercase" }}>
                Vol. {volumeNumber}
              </span>
            </div>

            <div
              style={{
                textAlign: "center",
                fontSize: format === "twitter" ? 54 : 50,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                textShadow: "1px 1px 0 rgba(0,0,0,0.08)",
              }}
            >
              {PAPER_NAME}
            </div>

            <div
              style={{
                marginTop: 8,
                borderTop: `2px solid ${C.ink}`,
                borderBottom: `1px solid ${C.ink}`,
                paddingTop: 5,
                paddingBottom: 5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkLight }}>
                Vol. {volumeNumber} — No. {issueNumber}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkLight }}>
                {TAGLINE}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: `${scale.padY}px ${scale.padX}px 0 ${scale.padX}px`,
          gap: 14,
          overflow: "hidden",
        }}
      >
        {categoryLabel && (
          <div
            style={{
              alignSelf: "flex-start",
              backgroundColor: categoryAccent,
              color: C.white,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "6px 14px",
            }}
          >
            {categoryLabel}
          </div>
        )}

        <h1
          style={{
            margin: 0,
            fontSize: scale.headline,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            fontWeight: 700,
            maxHeight: format === "twitter" ? 170 : 250,
            overflow: "hidden",
          }}
        >
          {headline}
        </h1>

        {dek && (
          <p
            style={{
              margin: 0,
              fontSize: scale.dek,
              lineHeight: 1.35,
              color: C.inkSoft,
              fontStyle: "italic",
              maxHeight: format === "twitter" ? 86 : 110,
              overflow: "hidden",
            }}
          >
            {dek}
          </p>
        )}

        <div style={{ width: "100%", height: 2, backgroundColor: C.inkLight, opacity: 0.6, flexShrink: 0 }} />

        {body && (
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontSize: scale.body * 3,
                lineHeight: 0.85,
                fontWeight: 700,
                color: C.ink,
                flexShrink: 0,
              }}
            >
              {dropCap}
            </span>
            <p
              style={{
                margin: 0,
                fontSize: bodyFontSize,
                lineHeight: 1.48,
                color: C.inkSoft,
                overflow: "hidden",
              }}
            >
              {bodyRest}
            </p>
          </div>
        )}
      </div>

      {payload.probability !== null && payload.probability !== undefined && (
        <div
          style={{
            width: "100%",
            backgroundColor: C.accent,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 24px",
            color: C.white,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 46, fontWeight: 900, lineHeight: 1 }}>{Math.round(payload.probability)}%</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7 }}>
              Market Odds
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {probLabel(Math.round(payload.probability))}
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          width: "100%",
          backgroundColor: C.accent,
          borderTop: "1px solid rgba(255,255,255,0.18)",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          color: C.white,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>{PAPER_NAME}</span>
          <span style={{ fontSize: 11, letterSpacing: "0.08em", opacity: 0.72 }}>Tomorrow's News</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            backgroundColor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            padding: "8px 12px",
            maxWidth: format === "twitter" ? 330 : 380,
            flexShrink: 1,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>{ctaPrimary}</span>
          <span style={{ fontSize: 17, fontWeight: 900, color: C.gold, marginTop: 2 }}>↗ {CTA_DOMAIN}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Generates PNG playcard image.
 * Auto format:
 * - Has image URL/data → portrait
 * - No image → instagram
 */
export async function generatePlaycardResponse(
  payload: PlaycardPayload,
  _options?: { baseUrl?: string },
): Promise<Response> {
  const hasImage = Boolean(
    payload.imageUrl && (payload.imageUrl.startsWith("data:image") || /^https?:\/\//i.test(payload.imageUrl)),
  );

  const format: PlaycardFormat = payload.format ?? (hasImage ? "portrait" : "instagram");
  const { w, h } = DIMS[format];

  return new ImageResponse(
    <EditorialCard payload={payload} format={format} />,
    { width: w, height: h },
  );
}

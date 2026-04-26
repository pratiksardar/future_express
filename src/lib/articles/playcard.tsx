/**
 * Social playcard image generator — premium newspaper editorial style.
 * Uses next/og ImageResponse.
 */

import { ImageResponse } from "next/og";
import { fitText, fitWithBestSize, PRETEXT_MEASUREMENT_FAMILY } from "./textFit";

export type PlaycardFormat = "twitter" | "instagram" | "portrait" | "tiktok";
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
  // 1.91:1 — universally safe (Twitter, LinkedIn, FB, WhatsApp, Slack, iMessage)
  twitter: { w: 1200, h: 630 },
  instagram: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  tiktok: { w: 1080, h: 1920 },
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
const CTA_DOMAIN = "thefutureexpress.com";
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

/**
 * Legacy character-count truncation. Kept as a safety net for the textFit
 * fallback path and any code paths that still want a quick approximate cut.
 */
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

type Scale = {
  headline: number;
  /** Headline size ladder, largest first. We pick the biggest size that fits. */
  headlineSizes: number[];
  dek: number;
  body: number;
  meta: number;
  padX: number;
  padY: number;
  /** Legacy: char-count budget used by the truncWordBoundary fallback path. */
  headlineMax: number;
  bodyMax: number;
};

function scaleFor(format: PlaycardFormat): Scale {
  if (format === "twitter") {
    const headlineSizes = [68, 60, 52, 44];
    return {
      headline: headlineSizes[0],
      headlineSizes,
      dek: 35,
      body: 28,
      meta: 15,
      padX: 56,
      padY: 36,
      headlineMax: 95,
      bodyMax: 220,
    };
  }
  // Instagram (1:1): larger type and more copy so content fills the card and reads at a glance
  if (format === "instagram") {
    const headlineSizes = [78, 70, 62, 54];
    return {
      headline: headlineSizes[0],
      headlineSizes,
      dek: 32,
      body: 28,
      meta: 14,
      padX: 44,
      padY: 28,
      headlineMax: 140,
      bodyMax: 480,
    };
  }
  // TikTok (9:16, 1080x1920): vertical hero — masthead can breathe, big scroll-stopping headline,
  // long body block that reads top-to-bottom on a phone screen.
  if (format === "tiktok") {
    const headlineSizes = [100, 88, 76, 64];
    return {
      headline: headlineSizes[0],
      headlineSizes,
      dek: 36,
      body: 30,
      meta: 14,
      padX: 56,
      padY: 36,
      headlineMax: 130,
      bodyMax: 620,
    };
  }
  // Portrait (4:5): same idea — fill the space, scroll-stopping readability
  const headlineSizes = [76, 68, 60, 52];
  return {
    headline: headlineSizes[0],
    headlineSizes,
    dek: 30,
    body: 27,
    meta: 13,
    padX: 48,
    padY: 28,
    headlineMax: 150,
    bodyMax: 520,
  };
}

const HEADLINE_LINE_HEIGHT = 1.12;
const DEK_LINE_HEIGHT = 1.38;
const BODY_LINE_HEIGHT_TIKTOK = 1.52;
const BODY_LINE_HEIGHT_DEFAULT = 1.48;

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

  // Per-format tunables to keep the JSX readable
  const mastheadFontSize =
    format === "twitter" ? 54 : format === "instagram" ? 52 : format === "tiktok" ? 64 : 50;
  const headlineMaxLines = format === "twitter" ? 2 : 3;
  const dekMaxLines = format === "twitter" ? 2 : 3;
  const bodyBlockPaddingTop = format === "tiktok" ? 22 : 12;
  const bodyBlockPaddingBottom = format === "tiktok" ? scale.padY + 16 : scale.padY;

  // Card interior width = card width minus left+right padding. This is the
  // exact pixel width text must fit inside.
  const cardInteriorWidth = w - 2 * scale.padX;

  // 1) Headline — pick the biggest size from the ladder that fits in
  //    headlineMaxLines lines. Falls back to truncation at smallest size.
  //    Measurement uses Satori's bundled Noto Sans (PRETEXT_MEASUREMENT_FAMILY)
  //    so pretext line counts match the actual rendered glyph advances.
  const headlineFit = fitWithBestSize({
    text: payload.headline,
    fontFamily: PRETEXT_MEASUREMENT_FAMILY,
    weight: "700",
    sizes: scale.headlineSizes,
    lineHeight: HEADLINE_LINE_HEIGHT,
    maxWidth: cardInteriorWidth,
    maxLines: headlineMaxLines,
  });
  const headline = headlineFit.text;
  const headlineFontSize = headlineFit.fontSize;

  // 2) Dek (italic) — single fixed size, hard line cap.
  const dekSource = payload.subheadline || payload.bodyExcerpt || "";
  const dekFit = fitText({
    text: dekSource,
    font: `italic 400 ${scale.dek}px ${PRETEXT_MEASUREMENT_FAMILY}`,
    fontSize: scale.dek,
    lineHeight: DEK_LINE_HEIGHT,
    maxWidth: cardInteriorWidth,
    maxLines: dekMaxLines,
  });
  const dek = dekFit.text;

  // 3) Body excerpt — fixed size, generous line cap (the surrounding flexbox
  //    enforces an absolute pixel max via overflow:hidden, but truncating
  //    here keeps the rendered text from being painted past the visible area).
  const bodySource = payload.bodyExcerpt || payload.subheadline || "";
  const bodyFontSize = payload.bodyExcerpt ? scale.dek : scale.body;
  // Drop cap occupies a separate flex column ~3x the body size, so the
  // wrapped paragraph fits in roughly cardInteriorWidth minus that drop-cap
  // column. Approximate: subtract bodyFontSize * 2 + the column gap.
  const bodyMaxLines =
    format === "twitter" ? 4 : format === "instagram" ? 9 : format === "tiktok" ? 14 : 11;
  const bodyTextWidth = Math.max(200, cardInteriorWidth - bodyFontSize * 2 - 14);
  const bodyFit = fitText({
    text: bodySource,
    font: `400 ${bodyFontSize}px ${PRETEXT_MEASUREMENT_FAMILY}`,
    fontSize: bodyFontSize,
    lineHeight: format === "tiktok" ? BODY_LINE_HEIGHT_TIKTOK : BODY_LINE_HEIGHT_DEFAULT,
    maxWidth: bodyTextWidth,
    maxLines: bodyMaxLines,
  });
  const body = bodyFit.text;
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
          padding: `${format === "tiktok" ? 18 : 12}px ${scale.padX}px ${format === "tiktok" ? 14 : 10}px ${scale.padX}px`,
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
              padding: format === "tiktok" ? "12px 18px 14px 18px" : "8px 14px 10px 14px",
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
                paddingBottom: format === "tiktok" ? 9 : 7,
                marginBottom: format === "tiktok" ? 12 : 8,
              }}
            >
              <span style={{ fontSize: format === "tiktok" ? 13 : 11, fontWeight: 700, letterSpacing: "0.14em", color: C.inkLight, textTransform: "uppercase" }}>
                {payload.publishedAt ?? ""}
              </span>
              <span style={{ fontSize: format === "tiktok" ? 13 : 11, letterSpacing: "0.08em", color: C.inkLight, fontStyle: "italic" }}>
                The Independent Intelligence of the Future
              </span>
              <span style={{ fontSize: format === "tiktok" ? 13 : 11, fontWeight: 700, letterSpacing: "0.14em", color: C.inkLight, textTransform: "uppercase" }}>
                Vol. {volumeNumber}
              </span>
            </div>

            <div
              style={{
                textAlign: "center",
                fontSize: mastheadFontSize,
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
                marginTop: format === "tiktok" ? 12 : 8,
                borderTop: `2px solid ${C.ink}`,
                borderBottom: `1px solid ${C.ink}`,
                paddingTop: format === "tiktok" ? 7 : 5,
                paddingBottom: format === "tiktok" ? 7 : 5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: format === "tiktok" ? 12 : 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkLight }}>
                Vol. {volumeNumber} — No. {issueNumber}
              </span>
              <span style={{ fontSize: format === "tiktok" ? 12 : 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkLight }}>
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
          gap: format === "tiktok" ? 18 : 14,
          overflow: "hidden",
        }}
      >
        {categoryLabel && (
          <div
            style={{
              alignSelf: "flex-start",
              backgroundColor: categoryAccent,
              color: C.white,
              fontSize: format === "instagram" ? 13 : format === "tiktok" ? 15 : 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding:
                format === "instagram" ? "7px 16px" : format === "tiktok" ? "8px 18px" : "6px 14px",
            }}
          >
            {categoryLabel}
          </div>
        )}

        <h1
          style={{
            margin: 0,
            fontSize: headlineFontSize,
            lineHeight: HEADLINE_LINE_HEIGHT,
            letterSpacing: "-0.02em",
            fontWeight: 700,
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
              lineHeight: DEK_LINE_HEIGHT,
              color: C.inkSoft,
              fontStyle: "italic",
              overflow: "hidden",
            }}
          >
            {dek}
          </p>
        )}

        {/* Article body block: fills remaining space so no empty gap above CTA (UX: no sea of white) */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            backgroundColor: C.paperLine,
            marginLeft: -scale.padX,
            marginRight: -scale.padX,
            paddingLeft: scale.padX,
            paddingRight: scale.padX,
            paddingTop: bodyBlockPaddingTop,
            paddingBottom: bodyBlockPaddingBottom,
          }}
        >
          <div style={{ width: "100%", height: 2, backgroundColor: C.inkLight, opacity: 0.5, flexShrink: 0, marginBottom: format === "tiktok" ? 18 : 12 }} />

          {body ? (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                gap: format === "tiktok" ? 14 : 10,
                alignItems: "flex-start",
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
                  flex: 1,
                  fontSize: bodyFontSize,
                  lineHeight: format === "tiktok" ? BODY_LINE_HEIGHT_TIKTOK : BODY_LINE_HEIGHT_DEFAULT,
                  color: C.inkSoft,
                  overflow: "hidden",
                }}
              >
                {bodyRest}
              </p>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0 }} />
          )}
        </div>
      </div>

      {payload.probability !== null && payload.probability !== undefined && (
        <div
          style={{
            width: "100%",
            backgroundColor: C.accent,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            gap: format === "tiktok" ? 18 : 14,
            padding: format === "tiktok" ? "22px 32px" : "16px 24px",
            color: C.white,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: format === "tiktok" ? 64 : 46, fontWeight: 900, lineHeight: 1 }}>{Math.round(payload.probability)}%</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: format === "tiktok" ? 14 : 12, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7 }}>
              Market Odds
            </span>
            <span style={{ fontSize: format === "tiktok" ? 20 : 16, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
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
          padding: format === "tiktok" ? "20px 32px" : "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          color: C.white,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
          <span style={{ fontSize: format === "tiktok" ? 18 : 14, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>{PAPER_NAME}</span>
          <span style={{ fontSize: format === "tiktok" ? 13 : 11, letterSpacing: "0.08em", opacity: 0.72 }}>Tomorrow's News</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            backgroundColor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            padding: format === "tiktok" ? "10px 16px" : "8px 12px",
            maxWidth: format === "twitter" ? 330 : format === "tiktok" ? 460 : 380,
            flexShrink: 1,
          }}
        >
          <span style={{ fontSize: format === "tiktok" ? 16 : 13, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>{ctaPrimary}</span>
          <span style={{ fontSize: format === "tiktok" ? 22 : 17, fontWeight: 900, color: C.gold, marginTop: 2 }}>↗ {CTA_DOMAIN}</span>
          {format === "tiktok" && (
            <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.65, marginTop: 4 }}>
              Save & Swipe ↑
            </span>
          )}
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
 *
 * When called from the OG image route (`format = "twitter"`), we attach a
 * long-lived `Cache-Control` so social-platform crawlers (Slackbot, LinkedInBot,
 * Twitterbot) and CDN edges don't re-render the card on every unfurl. Articles
 * are immutable per slug, so 24h freshness with a week-long SWR is safe.
 */
export async function generatePlaycardResponse(
  payload: PlaycardPayload,
  _options?: { baseUrl?: string },
): Promise<Response> {
  const hasImage = Boolean(
    payload.imageUrl && (payload.imageUrl.startsWith("data:image") || /^https?:\/\//i.test(payload.imageUrl)),
  );

  // Respect an explicit format from the caller (e.g. "twitter" for OG image routes).
  // Fall back to image-aware defaults only when no format is provided.
  const format: PlaycardFormat = payload.format ?? (hasImage ? "portrait" : "instagram");
  const { w, h } = DIMS[format];

  // The OG-image path uses the twitter format; cache it aggressively.
  // Other formats (saved cards, downloads) shouldn't be cached at the CDN.
  const isOgRender = format === "twitter";
  const cacheControl = isOgRender
    ? "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
    : "public, max-age=0, must-revalidate";

  return new ImageResponse(
    <EditorialCard payload={payload} format={format} />,
    {
      width: w,
      height: h,
      headers: {
        "Cache-Control": cacheControl,
      },
    },
  );
}

// Re-export for the (small) callers that still want a raw character-count cut.
export { truncWordBoundary };

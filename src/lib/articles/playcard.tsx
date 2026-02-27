/**
 * Social playcard image generator — premium editorial style for Twitter/X and Instagram.
 * Uses next/og ImageResponse (Satori). No LLM.
 *
 * Formats:
 *   "twitter"   → 1200 × 675  (16:9)  — optimised for Twitter/X cards
 *   "instagram" → 1080 × 1080 (1:1)   — Instagram square (default when no image)
 *   "portrait"  → 1080 × 1350 (4:5)   — Instagram portrait (default when image exists)
 */

import { ImageResponse } from "next/og";

export type PlaycardFormat = "twitter" | "instagram" | "portrait";

export type PlaycardPayload = {
  headline: string;
  subheadline?: string | null;
  /** First N chars of article body for card content. */
  bodyExcerpt?: string | null;
  /** Optional article image URL (data URI only in OG runtime). */
  imageUrl?: string | null;
  slug: string;
  category?: string;
  /** Short date string, e.g. "Feb 26, 2025" */
  publishedAt?: string;
  /** Prediction market probability 0-100 */
  probability?: number | null;
  /** Social format override. Auto-detected when omitted. */
  format?: PlaycardFormat;
};

// ─── Dimensions ──────────────────────────────────────────────────────────────
const DIMS: Record<PlaycardFormat, { w: number; h: number }> = {
  twitter:   { w: 1200, h: 675  },
  instagram: { w: 1080, h: 1080 },
  portrait:  { w: 1080, h: 1350 },
};

// ─── Brand palette ────────────────────────────────────────────────────────────
const C = {
  ink:        "#0d0d0d",
  inkMid:     "#2e2e2e",
  inkLight:   "#6b6b6b",
  paper:      "#faf7f2",
  paperWarm:  "#f0ebe0",
  gold:       "#b8860b",
  goldLight:  "#d4a017",
  cream:      "#fdf9f3",
  accent:     "#1b3a5c",   // deep navy — The Future Express brand
  accentMid:  "#224a75",
  white:      "#ffffff",
  redHot:     "#c0392b",
} as const;

// ─── Category colours ─────────────────────────────────────────────────────────
const CATEGORY_ACCENT: Record<string, string> = {
  politics:      "#c0392b",
  economy:       "#1b3a5c",
  crypto:        "#7b2d8b",
  sports:        "#1a6b3c",
  science:       "#0d5c8a",
  entertainment: "#b5430a",
  world:         "#2c4a1e",
};

const CATEGORY_LABELS: Record<string, string> = {
  politics:      "Politics",
  economy:       "Economy & Markets",
  crypto:        "Crypto",
  sports:        "Sports",
  science:       "Science",
  entertainment: "Entertainment",
  world:         "World",
};

const CTA_DOMAIN  = "future-express.vercel.app";
const PAPER_NAME  = "THE FUTURE EXPRESS";
const TAGLINE     = "Tomorrow's News · Today's Odds";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function trunc(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function probLabel(p: number) {
  if (p >= 80) return "Very Likely";
  if (p >= 60) return "Likely";
  if (p >= 40) return "Uncertain";
  if (p >= 20) return "Unlikely";
  return "Very Unlikely";
}

function probColor(p: number) {
  if (p >= 70) return "#1a6b3c";
  if (p >= 50) return "#0d5c8a";
  if (p >= 30) return "#b5430a";
  return "#c0392b";
}

// ─── Twitter / X card  (1200 × 675, dark editorial) ──────────────────────────
function TwitterCard({
  payload,
  hasImage,
  imageSrc,
  categoryLabel,
  catAccent,
  bodyText,
}: {
  payload: PlaycardPayload;
  hasImage: boolean;
  imageSrc: string | null;
  categoryLabel: string;
  catAccent: string;
  bodyText: string;
}) {
  const { w, h } = DIMS.twitter;
  const prob = payload.probability ?? null;

  return (
    <div
      style={{
        width: w,
        height: h,
        display: "flex",
        fontFamily: "Georgia, 'Times New Roman', serif",
        backgroundColor: C.ink,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Background image (blurred + darkened) ── */}
      {hasImage && imageSrc && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt=""
            width={w}
            height={h}
            style={{
              objectFit: "cover",
              width: "100%",
              height: "100%",
              opacity: 0.22,
            }}
          />
        </div>
      )}

      {/* ── Gradient overlay for readability ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(13,13,13,0.98) 0%, rgba(13,13,13,0.85) 60%, rgba(27,58,92,0.70) 100%)",
          display: "flex",
        }}
      />

      {/* ── Gold rule top accent ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: `linear-gradient(90deg, ${C.gold} 0%, ${C.goldLight} 50%, ${C.gold} 100%)`,
          display: "flex",
        }}
      />

      {/* ── Content layer ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "42px 56px 38px 56px",
        }}
      >
        {/* Masthead row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 22,
                fontWeight: 900,
                color: C.white,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {PAPER_NAME}
            </span>
            <span
              style={{
                fontSize: 11,
                color: C.goldLight,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginTop: 3,
              }}
            >
              {TAGLINE}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {categoryLabel && (
              <div
                style={{
                  backgroundColor: catAccent,
                  paddingTop: 6,
                  paddingBottom: 6,
                  paddingLeft: 14,
                  paddingRight: 14,
                  display: "flex",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.white,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  {categoryLabel}
                </span>
              </div>
            )}
            {payload.publishedAt && (
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.05em",
                }}
              >
                {payload.publishedAt}
              </span>
            )}
          </div>
        </div>

        {/* Thin gold divider */}
        <div
          style={{
            height: 1,
            backgroundColor: C.gold,
            opacity: 0.5,
            marginBottom: 30,
            display: "flex",
          }}
        />

        {/* Headline — massive */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1
            style={{
              fontSize: hasImage ? 54 : 62,
              fontWeight: 900,
              color: C.white,
              lineHeight: 1.1,
              margin: 0,
              marginBottom: 20,
              letterSpacing: "-0.02em",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {trunc(payload.headline, hasImage ? 110 : 130)}
          </h1>

          {bodyText && (
            <p
              style={{
                fontSize: 20,
                color: "rgba(255,255,255,0.72)",
                lineHeight: 1.45,
                margin: 0,
                display: "flex",
                flexWrap: "wrap",
              }}
            >
              {trunc(bodyText, 180)}
            </p>
          )}
        </div>

        {/* Bottom row: probability chip + CTA */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: 28,
          }}
        >
          {prob !== null ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                paddingTop: 10,
                paddingBottom: 10,
                paddingLeft: 18,
                paddingRight: 18,
              }}
            >
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color: probColor(prob),
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {prob}%
              </span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  }}
                >
                  Market Probability
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: probColor(prob),
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginTop: 2,
                  }}
                >
                  {probLabel(prob)}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.04em",
              }}
            >
              Read the full story at
            </span>
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: C.goldLight,
                letterSpacing: "0.04em",
              }}
            >
              {CTA_DOMAIN}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Instagram Square / Portrait card ────────────────────────────────────────
function InstagramCard({
  payload,
  hasImage,
  imageSrc,
  categoryLabel,
  catAccent,
  bodyText,
  format,
}: {
  payload: PlaycardPayload;
  hasImage: boolean;
  imageSrc: string | null;
  categoryLabel: string;
  catAccent: string;
  bodyText: string;
  format: "instagram" | "portrait";
}) {
  const { w, h } = DIMS[format];
  const prob = payload.probability ?? null;
  // Portrait with image: hero occupies top portion
  const heroH = format === "portrait" && hasImage ? 520 : 0;
  const isPortraitWithImage = format === "portrait" && hasImage;

  return (
    <div
      style={{
        width: w,
        height: h,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Georgia, 'Times New Roman', serif",
        backgroundColor: C.paper,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Gold top bar ── */}
      <div
        style={{
          width: "100%",
          height: 8,
          background: `linear-gradient(90deg, ${C.gold} 0%, ${C.goldLight} 50%, ${C.gold} 100%)`,
          display: "flex",
          flexShrink: 0,
        }}
      />

      {/* ── Hero image for portrait ── */}
      {isPortraitWithImage && imageSrc && (
        <div
          style={{
            width: "100%",
            height: heroH,
            overflow: "hidden",
            display: "flex",
            flexShrink: 0,
            position: "relative",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt=""
            width={w}
            height={heroH}
            style={{
              objectFit: "cover",
              width: "100%",
              height: "100%",
            }}
          />
          {/* Fade bottom of image into paper */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 120,
              background: `linear-gradient(to bottom, transparent, ${C.paper})`,
              display: "flex",
            }}
          />
        </div>
      )}

      {/* ── Main content area ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: isPortraitWithImage ? "20px 56px 0 56px" : "40px 56px 0 56px",
          position: "relative",
        }}
      >
        {/* Masthead (only when no hero image) */}
        {!isPortraitWithImage && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: 32,
              paddingBottom: 24,
              borderBottom: `2px solid ${C.ink}`,
            }}
          >
            {/* Double-rule masthead frame */}
            <div
              style={{
                border: `3px solid ${C.ink}`,
                padding: 3,
                display: "flex",
                width: "100%",
              }}
            >
              <div
                style={{
                  border: `1px solid ${C.ink}`,
                  padding: "12px 20px",
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                }}
              >
                {/* Date / tagline row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: `1px solid ${C.ink}`,
                    paddingBottom: 8,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      color: C.inkLight,
                    }}
                  >
                    {payload.publishedAt ?? ""}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: C.inkLight,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {TAGLINE}
                  </span>
                </div>

                {/* Big paper name */}
                <div
                  style={{
                    textAlign: "center",
                    fontSize: format === "instagram" ? 46 : 38,
                    fontWeight: 900,
                    color: C.ink,
                    letterSpacing: "-0.01em",
                    lineHeight: 1,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {PAPER_NAME}
                </div>

                {/* Bottom rule */}
                <div
                  style={{
                    borderTop: `1px solid ${C.ink}`,
                    paddingTop: 8,
                    marginTop: 12,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.25em",
                    color: C.inkLight,
                    textAlign: "center",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  The Independent Intelligence of the Future
                </div>
              </div>
            </div>
          </div>
        )}

        {/* When portrait+image: compact masthead strip */}
        {isPortraitWithImage && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: `2px solid ${C.ink}`,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: C.ink,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {PAPER_NAME}
            </span>
            <span
              style={{
                fontSize: 11,
                color: C.inkLight,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {payload.publishedAt ?? ""}
            </span>
          </div>
        )}

        {/* Category pill */}
        {categoryLabel && (
          <div
            style={{
              display: "flex",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                backgroundColor: catAccent,
                paddingTop: 6,
                paddingBottom: 6,
                paddingLeft: 16,
                paddingRight: 16,
                display: "flex",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.white,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                {categoryLabel}
              </span>
            </div>
          </div>
        )}

        {/* Headline */}
        <h1
          style={{
            fontSize: format === "instagram" ? (hasImage ? 48 : 58) : 44,
            fontWeight: 900,
            color: C.ink,
            lineHeight: 1.1,
            margin: 0,
            marginBottom: 20,
            letterSpacing: "-0.02em",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {trunc(
            payload.headline,
            format === "instagram" ? 100 : 120,
          )}
        </h1>

        {/* Decorative rule */}
        <div
          style={{
            width: 64,
            height: 3,
            backgroundColor: catAccent || C.gold,
            marginBottom: 18,
            display: "flex",
          }}
        />

        {/* Body excerpt */}
        {bodyText && (
          <p
            style={{
              fontSize: format === "instagram" ? 20 : 19,
              color: C.inkMid,
              lineHeight: 1.55,
              margin: 0,
              display: "flex",
              flexWrap: "wrap",
              flex: 1,
            }}
          >
            {trunc(
              bodyText,
              format === "instagram" ? (hasImage ? 260 : 360) : 320,
            )}
          </p>
        )}

        {/* Probability badge (inline) */}
        {prob !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 24,
              paddingTop: 20,
              paddingBottom: 20,
              paddingLeft: 24,
              paddingRight: 24,
              backgroundColor: C.accent,
            }}
          >
            <span
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: C.white,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {prob}%
            </span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                }}
              >
                Market Probability
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.white,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginTop: 3,
                }}
              >
                {probLabel(prob)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Spacer ── */}
      <div style={{ flex: 1, display: "flex" }} />

      {/* ── CTA footer ── */}
      <div
        style={{
          width: "100%",
          backgroundColor: C.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 56,
          paddingRight: 56,
          flexShrink: 0,
        }}
      >
        {/* Left: icon-like bracket + paper name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 4,
              height: 36,
              backgroundColor: C.goldLight,
              display: "flex",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: C.white,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {PAPER_NAME}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "0.06em",
                marginTop: 2,
              }}
            >
              {CTA_DOMAIN}
            </span>
          </div>
        </div>

        {/* Right: read more */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            Read full story
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: C.goldLight,
              letterSpacing: "0.06em",
              marginTop: 3,
            }}
          >
            ↗ {CTA_DOMAIN}
          </span>
        </div>
      </div>

      {/* ── Gold bottom bar ── */}
      <div
        style={{
          width: "100%",
          height: 6,
          background: `linear-gradient(90deg, ${C.gold} 0%, ${C.goldLight} 50%, ${C.gold} 100%)`,
          display: "flex",
          flexShrink: 0,
        }}
      />
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Generates a PNG playcard image optimised for Twitter/X or Instagram.
 *
 * Format auto-detection when `payload.format` is omitted:
 *   - Has article image  → "portrait"  (Instagram 4:5)
 *   - No article image   → "instagram" (Instagram 1:1)
 *
 * Pass `payload.format = "twitter"` to generate the 1200×675 Twitter card.
 */
export async function generatePlaycardResponse(
  payload: PlaycardPayload,
  _options?: { baseUrl?: string },
): Promise<Response> {
  const hasImage = Boolean(
    payload.imageUrl && payload.imageUrl.startsWith("data:image"),
  );
  const imageSrc = hasImage ? payload.imageUrl! : null;

  // Resolve format
  const format: PlaycardFormat =
    payload.format ?? (hasImage ? "portrait" : "instagram");

  const { w, h } = DIMS[format];

  const categoryLabel =
    (payload.category && CATEGORY_LABELS[payload.category]) ||
    payload.category ||
    "";
  const catAccent =
    (payload.category && CATEGORY_ACCENT[payload.category]) || C.accent;

  const rawBody =
    payload.bodyExcerpt ||
    payload.subheadline ||
    "";
  const bodyText = rawBody ?? "";

  const element =
    format === "twitter" ? (
      <TwitterCard
        payload={payload}
        hasImage={hasImage}
        imageSrc={imageSrc}
        categoryLabel={categoryLabel}
        catAccent={catAccent}
        bodyText={bodyText}
      />
    ) : (
      <InstagramCard
        payload={payload}
        hasImage={hasImage}
        imageSrc={imageSrc}
        categoryLabel={categoryLabel}
        catAccent={catAccent}
        bodyText={bodyText}
        format={format}
      />
    );

  return new ImageResponse(element, { width: w, height: h });
}

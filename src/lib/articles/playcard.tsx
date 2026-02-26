/**
 * Social playcard image generator — collectible card style (Pokemon-card like).
 * No LLM; uses next/og ImageResponse (Satori) only.
 * Aspect ratios for social: 1:1 (square, 1080×1080) when no article image; 4:5 (1080×1350) when image exists.
 * Includes CTA: visit future-express.vercel.app for more context and news.
 */

import { ImageResponse } from "next/og";

export type PlaycardPayload = {
  headline: string;
  subheadline?: string | null;
  /** First N chars of article body for card content (more than subheadline). */
  bodyExcerpt?: string | null;
  /** Optional article image URL (data URI only in OG runtime). */
  imageUrl?: string | null;
  slug: string;
  category?: string;
  /** Short date string, e.g. "Feb 26, 2025" */
  publishedAt?: string;
};

/** Square 1:1 for Instagram/Twitter when no article image. */
const SIZE_SQUARE = 1080;
/** With image: 4:5 portrait (Instagram-friendly). */
const WIDTH_WITH_IMAGE = 1080;
const HEIGHT_4_5 = 1350; // 4:5

const CARD_PADDING = 28;
const BORDER_WIDTH = 10;
const BORDER_RADIUS = 24;
const INNER_RADIUS = BORDER_RADIUS - 4;

const COLORS = {
  cardBg: "#faf6ef",
  borderOuter: "#1a1a1a",
  borderAccent: "#b8860b",
  ink: "#1a1a1a",
  inkMedium: "#3d3d3d",
  inkLight: "#6b6b6b",
  ctaBg: "#1b3a5c",
  ctaText: "#faf6ef",
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  politics: "Politics",
  economy: "Economy",
  crypto: "Crypto",
  sports: "Sports",
  science: "Science",
  entertainment: "Entertainment",
  world: "World",
};

const CTA_URL = "future-express.vercel.app";

/**
 * Generates a PNG playcard. With image: hero + headline + body excerpt. Without image: bigger headline + more body content. CTA at bottom.
 */
export async function generatePlaycardResponse(
  payload: PlaycardPayload,
  _options?: { baseUrl?: string }
): Promise<Response> {
  const hasImage = Boolean(
    payload.imageUrl && payload.imageUrl.startsWith("data:image")
  );
  const imageSrc = hasImage ? payload.imageUrl! : null;
  const categoryLabel =
    (payload.category && CATEGORY_LABELS[payload.category]) ||
    payload.category ||
    "";
  const rawBody =
    payload.bodyExcerpt ||
    (payload.subheadline
      ? (payload.subheadline.length > 380
          ? payload.subheadline.slice(0, 377) + "…"
          : payload.subheadline)
      : "");
  // Square (no image) has less room — use shorter excerpt
  const bodyText = rawBody
    ? hasImage
      ? rawBody.length > 420
        ? rawBody.slice(0, 417) + "…"
        : rawBody
      : rawBody.length > 280
        ? rawBody.slice(0, 277) + "…"
        : rawBody
    : "";

  const headlineSize = hasImage ? 28 : 36;
  const imageAreaHeight = hasImage ? 500 : 0; // 4:5 card: hero takes ~500px
  const brandingBarHeight = hasImage ? 0 : 40;
  const width = hasImage ? WIDTH_WITH_IMAGE : SIZE_SQUARE;
  const height = hasImage ? HEIGHT_4_5 : SIZE_SQUARE;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#e8e4dc",
          fontFamily: "Georgia, serif",
          padding: BORDER_WIDTH,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: COLORS.borderOuter,
            borderRadius: BORDER_RADIUS,
            padding: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              backgroundColor: COLORS.borderAccent,
              borderRadius: INNER_RADIUS,
              padding: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                backgroundColor: COLORS.cardBg,
                borderRadius: INNER_RADIUS - 2,
                overflow: "hidden",
              }}
            >
              {hasImage && imageSrc ? (
                <div
                  style={{
                    width: "100%",
                    height: imageAreaHeight,
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt=""
                    width={width}
                    height={imageAreaHeight}
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </div>
              ) : (
                brandingBarHeight > 0 && (
                  <div
                    style={{
                      width: "100%",
                      height: brandingBarHeight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#ede7d9",
                      color: COLORS.inkLight,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                    }}
                  >
                    The Future Express
                  </div>
                )
              )}

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  paddingLeft: CARD_PADDING,
                  paddingRight: CARD_PADDING,
                  paddingTop: 16,
                  paddingBottom: 12,
                  minHeight: 0,
                }}
              >
                {categoryLabel && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: COLORS.inkLight,
                      marginBottom: 6,
                    }}
                  >
                    {categoryLabel}
                  </div>
                )}

                <h1
                  style={{
                    fontSize: headlineSize,
                    fontWeight: 800,
                    color: COLORS.ink,
                    lineHeight: 1.2,
                    margin: 0,
                    marginBottom: 8,
                    display: "flex",
                  }}
                >
                  {payload.headline.length > (hasImage ? 90 : 65)
                    ? payload.headline.slice(0, (hasImage ? 87 : 62)) + "…"
                    : payload.headline}
                </h1>

                {bodyText && (
                  <p
                    style={{
                      fontSize: 15,
                      color: COLORS.inkMedium,
                      lineHeight: 1.4,
                      margin: 0,
                      display: "flex",
                      flex: 1,
                    }}
                  >
                    {bodyText}
                  </p>
                )}

                {payload.publishedAt && (
                  <p
                    style={{
                      fontSize: 11,
                      color: COLORS.inkLight,
                      marginTop: 6,
                      margin: 0,
                    }}
                  >
                    {payload.publishedAt}
                  </p>
                )}
              </div>

              <div
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.ctaBg,
                  paddingTop: 14,
                  paddingBottom: 14,
                  paddingLeft: 20,
                  paddingRight: 20,
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: COLORS.ctaText,
                    letterSpacing: "0.02em",
                  }}
                >
                  Visit {CTA_URL} for more context and news
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
    }
  );
}

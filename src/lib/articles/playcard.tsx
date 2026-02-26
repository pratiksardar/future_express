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
const MASTHEAD_TAGLINE = "Tomorrow's News, Today's Odds";

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
  // Square (no image): allow more body text so content fills the card
  const bodyText = rawBody
    ? hasImage
      ? rawBody.length > 420
        ? rawBody.slice(0, 417) + "…"
        : rawBody
      : rawBody.length > 420
        ? rawBody.slice(0, 417) + "…"
        : rawBody
    : "";

  const headlineSize = hasImage ? 28 : 52;
  const bodyFontSize = hasImage ? 16 : 22;
  const categoryFontSize = hasImage ? 10 : 14;
  const dateFontSize = hasImage ? 11 : 14;
  const imageAreaHeight = hasImage ? 500 : 0; // 4:5 card: hero takes ~500px
  const mastheadHeight = hasImage ? 0 : 92; // Newspaper-style header for square card
  const width = hasImage ? WIDTH_WITH_IMAGE : SIZE_SQUARE;
  const height = hasImage ? HEIGHT_4_5 : SIZE_SQUARE;
  const contentPadding = hasImage ? 24 : 36;
  const ctaFontSize = hasImage ? 16 : 20;
  const ctaPaddingVertical = hasImage ? 14 : 18;
  const showMasthead = mastheadHeight > 0;

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
                showMasthead && (
                  <div
                    style={{
                      width: "100%",
                      height: mastheadHeight,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: COLORS.cardBg,
                      borderBottom: `2px solid ${COLORS.ink}`,
                    }}
                  >
                    {/* Newspaper-style double border frame (like Masthead.tsx) */}
                    <div
                      style={{
                        margin: "6px 12px",
                        border: `3px solid ${COLORS.ink}`,
                        padding: 2,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          border: `1px solid ${COLORS.ink}`,
                          padding: "8px 12px",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        {/* Top row: date + tagline */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: `2px solid ${COLORS.ink}`,
                            paddingBottom: 6,
                            marginBottom: 8,
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.15em",
                            color: COLORS.inkLight,
                          }}
                        >
                          <span>{payload.publishedAt ?? "—"}</span>
                          <span style={{ fontSize: 8, letterSpacing: "0.1em" }}>
                            {MASTHEAD_TAGLINE}
                          </span>
                        </div>
                        {/* Main title: THE FUTURE EXPRESS */}
                        <div
                          style={{
                            textAlign: "center",
                            fontSize: 26,
                            fontWeight: 900,
                            color: COLORS.ink,
                            letterSpacing: "-0.01em",
                            lineHeight: 1.1,
                          }}
                        >
                          THE FUTURE EXPRESS
                        </div>
                        {/* Bottom rule + volume line */}
                        <div
                          style={{
                            borderTop: `2px solid ${COLORS.ink}`,
                            paddingTop: 6,
                            marginTop: 8,
                            fontSize: 8,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            color: COLORS.inkLight,
                          }}
                        >
                          The Independent Intelligence of the Future
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  paddingLeft: contentPadding,
                  paddingRight: contentPadding,
                  paddingTop: hasImage ? 16 : 24,
                  paddingBottom: hasImage ? 12 : 20,
                  minHeight: 0,
                }}
              >
                {categoryLabel && (
                  <div
                    style={{
                      fontSize: categoryFontSize,
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: COLORS.inkLight,
                      marginBottom: hasImage ? 6 : 10,
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
                    marginBottom: hasImage ? 8 : 14,
                    display: "flex",
                  }}
                >
                  {payload.headline.length > (hasImage ? 90 : 75)
                    ? payload.headline.slice(0, (hasImage ? 87 : 72)) + "…"
                    : payload.headline}
                </h1>

                {bodyText && (
                  <p
                    style={{
                      fontSize: bodyFontSize,
                      color: COLORS.inkMedium,
                      lineHeight: 1.38,
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
                      fontSize: dateFontSize,
                      color: COLORS.inkLight,
                      marginTop: 10,
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
                  paddingTop: ctaPaddingVertical,
                  paddingBottom: ctaPaddingVertical,
                  paddingLeft: 24,
                  paddingRight: 24,
                }}
              >
                <span
                  style={{
                    fontSize: ctaFontSize,
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

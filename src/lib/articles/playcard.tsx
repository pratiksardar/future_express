/**
 * Social playcard image generator — collectible card style (Pokemon-card like).
 * No LLM; uses next/og ImageResponse (Satori) only.
 * Includes CTA: visit future-express.vercel.app for more context and news.
 */

import { ImageResponse } from "next/og";

export type PlaycardPayload = {
  headline: string;
  subheadline?: string | null;
  /** Optional article image URL (data URI only in OG runtime). */
  imageUrl?: string | null;
  slug: string;
  category?: string;
  /** Short date string, e.g. "Feb 26, 2025" */
  publishedAt?: string;
};

const WIDTH = 1200;
const HEIGHT = 630;

const CARD_PADDING = 32;
const BORDER_WIDTH = 12;
const BORDER_RADIUS = 28;
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
 * Generates a PNG playcard in collectible-card style with CTA.
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
        {/* Card outer frame (Pokemon-card style: dark border + gold accent) */}
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
          {/* Inner gold stripe */}
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
            {/* Card face */}
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
              {/* Art / image area (top of card) */}
              <div
                style={{
                  width: "100%",
                  height: 280,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  backgroundColor: "#ede7d9",
                }}
              >
                {hasImage && imageSrc ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={imageSrc}
                    alt=""
                    width={1200}
                    height={280}
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: COLORS.inkLight,
                      fontSize: 14,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                    }}
                  >
                    The Future Express
                  </div>
                )}
              </div>

              {/* Text area (name + description) */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  paddingLeft: CARD_PADDING,
                  paddingRight: CARD_PADDING,
                  paddingTop: 20,
                  paddingBottom: 16,
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

                {/* Headline — card “name” */}
                <h1
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: COLORS.ink,
                    lineHeight: 1.2,
                    margin: 0,
                    marginBottom: 10,
                    display: "flex",
                  }}
                >
                  {payload.headline.length > 88
                    ? payload.headline.slice(0, 85) + "…"
                    : payload.headline}
                </h1>

                {payload.subheadline && (
                  <p
                    style={{
                      fontSize: 18,
                      color: COLORS.inkMedium,
                      lineHeight: 1.35,
                      margin: 0,
                      display: "flex",
                      flex: 1,
                    }}
                  >
                    {payload.subheadline.length > 120
                      ? payload.subheadline.slice(0, 117) + "…"
                      : payload.subheadline}
                  </p>
                )}

                {payload.publishedAt && (
                  <p
                    style={{
                      fontSize: 11,
                      color: COLORS.inkLight,
                      marginTop: 8,
                      margin: 0,
                    }}
                  >
                    {payload.publishedAt}
                  </p>
                )}
              </div>

              {/* CTA bar (bottom of card) */}
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
      width: WIDTH,
      height: HEIGHT,
    }
  );
}

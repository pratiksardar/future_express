/**
 * Social playcard image generator.
 * Renders article as a shareable card (Twitter/social) — text-only or with optional article image.
 */

import { ImageResponse } from "next/og";

export type PlaycardPayload = {
  headline: string;
  subheadline?: string | null;
  /** Optional article image URL (absolute or data URI). Omitted for text-only cards. */
  imageUrl?: string | null;
  slug: string;
  category?: string;
  /** Short date string, e.g. "Feb 26, 2025" */
  publishedAt?: string;
};

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Generates a Response containing a PNG playcard image.
 * Can be returned from a route or consumed server-side to get a buffer.
 */
export async function generatePlaycardResponse(
  payload: PlaycardPayload,
  _options?: { baseUrl?: string }
): Promise<Response> {
  // Only embed article image if it's a data URI (no network fetch in OG runtime)
  const hasImage = Boolean(
    payload.imageUrl && payload.imageUrl.startsWith("data:image")
  );
  const imageSrc = hasImage ? payload.imageUrl! : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f5f0e8",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Top rule */}
        <div
          style={{
            width: "100%",
            height: 4,
            backgroundColor: "#8b7e6e",
            marginBottom: 24,
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            padding: "0 48px 32px",
            gap: 32,
          }}
        >
          {/* Text block */}
          <div
            style={{
              flex: hasImage ? "0 1 55%" : "1 1 100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: "#6b6b6b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              The Future Express
            </div>
            <h1
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: "#1a1a1a",
                lineHeight: 1.2,
                margin: 0,
                marginBottom: 16,
                display: "flex",
              }}
            >
              {payload.headline.length > 90
                ? payload.headline.slice(0, 87) + "…"
                : payload.headline}
            </h1>
            {payload.subheadline && (
              <p
                style={{
                  fontSize: 22,
                  color: "#3d3d3d",
                  lineHeight: 1.4,
                  margin: 0,
                  display: "flex",
                }}
              >
                {payload.subheadline.length > 140
                  ? payload.subheadline.slice(0, 137) + "…"
                  : payload.subheadline}
              </p>
            )}
            {payload.publishedAt && (
              <div
                style={{
                  marginTop: 24,
                  fontSize: 14,
                  color: "#9b9b9b",
                }}
              >
                {payload.publishedAt}
              </div>
            )}
          </div>
          {/* Optional article image */}
          {hasImage && imageSrc && (
            <div
              style={{
                flex: "0 0 38%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: 8,
                border: "2px solid #c4b9a8",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt=""
                width={400}
                height={280}
                style={{
                  objectFit: "cover",
                  width: "100%",
                  height: 280,
                }}
              />
            </div>
          )}
        </div>
        <div
          style={{
            width: "100%",
            height: 3,
            backgroundColor: "#8b7e6e",
            marginTop: "auto",
          }}
        />
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}

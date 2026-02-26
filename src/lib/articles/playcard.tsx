/**
 * Social playcard image generator (Option B: no LLM, no browser).
 * Layout mirrors the article page: masthead-style top, section-title category,
 * optional 21/9 image, headline, subheadline, byline, double rules.
 * Uses next/og ImageResponse (Satori) only — no API calls.
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

const COLORS = {
  paper: "#f5f0e8",
  ink: "#1a1a1a",
  inkMedium: "#3d3d3d",
  inkLight: "#6b6b6b",
  inkFaded: "#9b9b9b",
  rule: "#c4b9a8",
  ruleDark: "#8b7e6e",
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

/**
 * Generates a Response containing a PNG playcard image.
 * Layout matches article page: masthead strip, category, image (if any), headline, subhead, byline.
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
          backgroundColor: COLORS.paper,
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Top: double rule (matches divider-double / masthead) */}
        <div
          style={{
            width: "100%",
            height: 3,
            backgroundColor: COLORS.ruleDark,
            marginBottom: 12,
          }}
        />
        {/* Masthead-style strip: THE FUTURE EXPRESS */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            paddingTop: 8,
            paddingBottom: 8,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: COLORS.ink,
              letterSpacing: "-0.01em",
            }}
          >
            THE FUTURE EXPRESS
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 1,
            backgroundColor: COLORS.ruleDark,
            marginBottom: 20,
          }}
        />

        {/* Main content: same padding as article page */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            paddingLeft: 24,
            paddingRight: 24,
            paddingBottom: 24,
          }}
        >
          {/* Section title: category (matches .section-title) */}
          {categoryLabel && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: COLORS.inkLight,
                marginBottom: 8,
              }}
            >
              {categoryLabel}
            </div>
          )}

          {/* Optional article image: 21/9 strip (matches article aspect-[21/9]) */}
          {hasImage && imageSrc && (
            <div
              style={{
                width: "100%",
                height: 257,
                overflow: "hidden",
                borderRadius: 4,
                marginBottom: 20,
                display: "flex",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt=""
                width={1200}
                height={257}
                style={{
                  objectFit: "cover",
                  width: "100%",
                  height: 257,
                }}
              />
            </div>
          )}

          {/* Headline (matches article h1: font-display, bold, color-ink) */}
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: COLORS.ink,
              lineHeight: 1.2,
              margin: 0,
              marginBottom: 12,
              display: "flex",
            }}
          >
            {payload.headline.length > 95
              ? payload.headline.slice(0, 92) + "…"
              : payload.headline}
          </h1>

          {/* Subheadline (matches article: italic, font-sub, ink-medium) */}
          {payload.subheadline && (
            <p
              style={{
                fontSize: 20,
                fontStyle: "italic",
                color: COLORS.inkMedium,
                lineHeight: 1.4,
                margin: 0,
                marginBottom: 12,
                display: "flex",
              }}
            >
              {payload.subheadline.length > 130
                ? payload.subheadline.slice(0, 127) + "…"
                : payload.subheadline}
            </p>
          )}

          {/* Byline (matches article: "By The Future Express Newsroom · date · 5 min read") */}
          <p
            style={{
              fontSize: 12,
              fontStyle: "italic",
              color: COLORS.inkLight,
              margin: 0,
            }}
          >
            By The Future Express Newsroom
            {payload.publishedAt ? ` · ${payload.publishedAt}` : ""} · 5 min
            read
          </p>
        </div>

        {/* Bottom: double rule (matches divider-double) */}
        <div
          style={{
            width: "100%",
            height: 3,
            backgroundColor: COLORS.ruleDark,
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

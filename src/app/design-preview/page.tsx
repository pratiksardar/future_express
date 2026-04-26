import Link from "next/link";

export default function DesignPreviewIndex() {
  const variants = [
    {
      slug: "v1",
      title: "Variant 1 — Dignified Broadsheet",
      vibe: "Most retro. 1920s NYT restraint. Heavy ornament, italic display headlines, warm cream paper. Feels like a museum artifact.",
      tags: ["Italic Playfair", "5-col asymmetric", "Triple-border cartouche", "No motion"],
    },
    {
      slug: "v2",
      title: "Variant 2 — Editorial × Brutalist",
      vibe: "Balanced fusion. Vignelli-meets-broadsheet. Oversized condensed headlines, thick black rules, asymmetric grids, snappy hover transforms.",
      tags: ["128px headlines", "Thick rules", "3-col equal", "Yellow/red blocks"],
    },
    {
      slug: "v3",
      title: "Variant 3 — Modern Salon",
      vibe: "Most modern. Substack-style reading product dressed in retro typography. Spacious, mobile-first, soft scroll reveals, tabular figures.",
      tags: ["Single-column reading", "Hairline rules", "Italic wordmark", "Slow reveals"],
    },
    {
      slug: "v4",
      title: "Variant 4 — Retro × Tech × Modern",
      vibe: "1925 broadsheet body + 1985 line-printer data chrome. Type for humans, monospace for machines. ASCII odds boxes, blinking wire-dispatch cursor, agent signature footer.",
      tags: ["ASCII odds widget", "Wire-dispatch cursor", "Monospace data", "Agent signature"],
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0e0e0e",
        color: "#f0ece2",
        padding: "64px 24px",
        fontFamily:
          'var(--font-dm-sans), "Helvetica Neue", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#b8860b",
            marginBottom: 16,
          }}
        >
          The Future Express · Design Direction Preview
        </p>
        <h1
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontWeight: 900,
            fontSize: "clamp(36px, 5vw, 64px)",
            lineHeight: 1.05,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Pick One.
        </h1>
        <p
          style={{
            fontFamily: "var(--font-newsreader), Georgia, serif",
            fontStyle: "italic",
            fontSize: 19,
            lineHeight: 1.5,
            color: "#a8a294",
            marginTop: 12,
            marginBottom: 8,
            maxWidth: 620,
          }}
        >
          Three explorations of the retro × modern fusion. Each variant takes a
          distinct posture on type, grid, rule weight, and motion. Pick the one
          you want to ship.
        </p>
        <p
          style={{
            fontSize: 12,
            color: "#807a6d",
            marginBottom: 48,
            maxWidth: 620,
          }}
        >
          These are throwaway prototypes — mock data only, no DB, no auth, no
          analytics. Two of them get deleted after you choose.
        </p>

        <div style={{ display: "grid", gap: 16 }}>
          {variants.map((v) => (
            <Link
              key={v.slug}
              href={`/design-preview/${v.slug}`}
              style={{
                display: "block",
                padding: "32px",
                border: "1px solid #2a2a2a",
                background: "#161614",
                color: "inherit",
                textDecoration: "none",
                transition: "border-color 160ms ease, background 160ms ease",
              }}
              className="dpi-card"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-playfair), Georgia, serif",
                    fontWeight: 700,
                    fontSize: 28,
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {v.title}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#b8860b",
                  }}
                >
                  Open →
                </span>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-newsreader), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 17,
                  lineHeight: 1.5,
                  color: "#c8c4ba",
                  marginTop: 8,
                  marginBottom: 16,
                }}
              >
                {v.vibe}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {v.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      padding: "4px 8px",
                      border: "1px solid #3a3a3a",
                      color: "#a8a294",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        <p
          style={{
            fontSize: 11,
            color: "#5a5448",
            marginTop: 48,
            letterSpacing: "0.1em",
          }}
        >
          All four live at /design-preview/v1, /v2, /v3, /v4 — each with a
          day/night toggle in the corner. None of them touch product code.
        </p>
      </div>
    </div>
  );
}

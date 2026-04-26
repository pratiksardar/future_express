import Link from "next/link";
import "../preview-styles.css";
import EditionToggle from "../EditionToggle";
import {
  articles,
  edition,
  breakingTicker,
  dailyChallenge,
  classifieds,
} from "../_data";

export default function VariantOnePage() {
  const hero = articles[0];
  const sidebarLeads = articles.slice(1, 4);
  const more = articles.slice(4);

  return (
    <div className="v1-root v1-paper-bg" id="v1-root">
      <Link href="/design-preview" className="preview-back">
        ← Back
      </Link>
      <EditionToggle rootSelector="#v1-root" />
      <span className="preview-chip">VARIANT 1</span>

      {/* MASTHEAD */}
      <header style={{ padding: "32px 24px 16px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          {/* Top meta row */}
          <div
            className="v1-kicker"
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span>{edition.dateShort} · {edition.city}</span>
            <span style={{ fontStyle: "italic", textTransform: "none", letterSpacing: 0, fontFamily: "var(--font-newsreader), Georgia, serif", fontSize: 13, color: "var(--v1-ink-medium)" }}>
              {edition.strapline}
            </span>
            <span>VOL. {edition.volume} · NO. {edition.issue}</span>
          </div>

          <div className="v1-cartouche">
            <div className="v1-cartouche-inner">
              <h1 className="v1-wordmark">The Future Express</h1>
              <p
                style={{
                  textAlign: "center",
                  marginTop: 12,
                  fontFamily: "var(--font-newsreader), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 16,
                  color: "var(--v1-ink-medium)",
                }}
              >
                {edition.tagline}
              </p>
            </div>
          </div>

          {/* Bottom meta row */}
          <div
            className="v1-kicker"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 14,
              borderTop: "1px solid var(--v1-ink)",
              borderBottom: "1px solid var(--v1-ink)",
              padding: "8px 0",
            }}
          >
            <span>{edition.price}</span>
            <span style={{ color: "var(--v1-gold)" }}>
              POLYMARKET · KALSHI · LIVE
            </span>
            <span>SUNDAY EDITION</span>
          </div>
        </div>
      </header>

      {/* BREAKING TICKER */}
      <div
        style={{
          background: "var(--v1-paper-warm)",
          borderTop: "2px solid var(--v1-gold)",
          borderBottom: "1px solid var(--v1-ink)",
          padding: "10px 24px",
          marginBottom: 24,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            gap: 16,
            alignItems: "center",
          }}
        >
          <span
            className="v1-kicker"
            style={{
              color: "var(--v1-red)",
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 13,
              letterSpacing: "0.18em",
              flexShrink: 0,
            }}
          >
            EXTRA · EXTRA
          </span>
          <span
            style={{
              fontFamily: "var(--font-newsreader), Georgia, serif",
              fontSize: 14,
              color: "var(--v1-ink-medium)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {breakingTicker}
          </span>
        </div>
      </div>

      {/* HERO + SIDEBAR */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 64px" }}>
        <div className="v1-five-col" style={{ marginTop: 8 }}>
          {/* Hero column (spans 2fr) */}
          <article>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 16,
              }}
            >
              <span
                className="v1-kicker"
                style={{ color: "var(--v1-red)" }}
              >
                {hero.category}
              </span>
              <span className="v1-kicker">
                Front Page · Vol. {edition.volume}, No. {edition.issue}
              </span>
            </div>
            <div className="v1-rule-double" style={{ marginBottom: 20 }} />

            <h2 className="v1-hero-headline" style={{ marginBottom: 18 }}>
              {hero.headline}
            </h2>
            <p className="v1-hero-dek" style={{ marginBottom: 18 }}>
              {hero.dek}
            </p>

            <div
              className="v1-kicker"
              style={{ marginBottom: 18, color: "var(--v1-ink-medium)" }}
            >
              {hero.byline} · {hero.date} · {hero.readTime}
            </div>

            <div
              className="v1-rule-thin"
              style={{ marginBottom: 18, opacity: 0.6 }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr",
                gap: 24,
                alignItems: "start",
              }}
            >
              <div>
                <div
                  className="v1-halftone"
                  style={{
                    width: "100%",
                    aspectRatio: "16/10",
                    backgroundImage: `url("${hero.imageUrl}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundBlendMode: "multiply",
                    marginBottom: 8,
                  }}
                />
                <p
                  style={{
                    fontFamily: "var(--font-newsreader), Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 13,
                    color: "var(--v1-ink-light)",
                  }}
                >
                  Photograph: Newsroom archives · Treated halftone
                </p>

                {/* Article body excerpt with drop cap */}
                <div style={{ marginTop: 24 }}>
                  <p
                    className="v1-dropcap"
                    style={{
                      fontFamily: "var(--font-newsreader), Georgia, serif",
                      fontSize: 17,
                      lineHeight: 1.65,
                      color: "var(--v1-ink-medium)",
                      marginBottom: 16,
                    }}
                  >
                    Three soft inflation prints in a row have done what twelve
                    months of Federal Reserve rhetoric could not. The market is
                    convinced; the Committee, on the record, is not. Somewhere
                    between those two positions, $8.2 million of capital has
                    already chosen sides — and the sides are not symmetric.
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-newsreader), Georgia, serif",
                      fontSize: 17,
                      lineHeight: 1.65,
                      color: "var(--v1-ink-medium)",
                    }}
                  >
                    Polymarket's June rate-cut contract opened the year at 22 cents.
                    It traded through 40 in March, paused at the FOMC, and broke 60
                    on Tuesday morning before the CPI release was thirty seconds old.
                  </p>
                </div>
              </div>

              {/* Odds widget */}
              <aside className="v1-odds">
                <div className="v1-kicker" style={{ marginBottom: 8 }}>
                  The Odds
                </div>
                <div className="v1-rule-thin" style={{ marginBottom: 12 }} />
                <div
                  className="v1-odds-num"
                  style={{ color: "var(--v1-ink)" }}
                >
                  {hero.probability}%
                </div>
                <div
                  className="v1-kicker"
                  style={{ marginTop: 4, color: "var(--v1-red)" }}
                >
                  {hero.probabilityLabel}
                </div>
                <div className="v1-rule-thin" style={{ margin: "16px 0" }} />
                <div
                  style={{
                    fontFamily: "var(--font-newsreader), Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 13,
                    color: "var(--v1-ink-light)",
                  }}
                >
                  {hero.source} · Volume {hero.volume}
                </div>
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: "1px solid var(--v1-ink)",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--v1-ink)",
                  }}
                >
                  Trade on {hero.source} →
                </div>
              </aside>
            </div>
          </article>

          {/* Sidebar leads — 3 columns */}
          {sidebarLeads.map((a) => (
            <aside key={a.slug} className="v1-column-rule">
              <div
                className="v1-kicker"
                style={{ color: "var(--v1-red)", marginBottom: 8 }}
              >
                {a.category}
              </div>
              <h3 className="v1-card-headline" style={{ marginBottom: 10 }}>
                <a href="#">{a.headline}</a>
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-newsreader), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: "var(--v1-ink-medium)",
                  marginBottom: 14,
                }}
              >
                {a.dek}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid var(--v1-rule)",
                  paddingTop: 8,
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 12,
                  fontVariantNumeric: "tabular-nums lining-nums",
                }}
              >
                <span style={{ color: "var(--v1-ink)" }}>
                  {a.probability}%
                </span>
                <span
                  className="v1-kicker"
                  style={{ color: "var(--v1-ink-light)" }}
                >
                  {a.source}
                </span>
              </div>
            </aside>
          ))}
        </div>

        {/* SECTION RULE */}
        <div className="v1-rule-double" style={{ margin: "48px 0 32px" }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontWeight: 700,
              fontStyle: "italic",
              fontSize: 28,
              margin: 0,
            }}
          >
            More from the Editions
          </h3>
          <span className="v1-kicker">Continued · Page 2</span>
        </div>
        <div className="v1-rule-thin" style={{ marginBottom: 24 }} />

        {/* SECONDARY GRID + DAILY CHALLENGE */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 32,
          }}
          className="v1-secondary-grid"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
            }}
          >
            {more.map((a) => (
              <article
                key={a.slug}
                style={{
                  borderBottom: "1px solid var(--v1-rule)",
                  paddingBottom: 20,
                }}
              >
                <div
                  className="v1-halftone"
                  style={{
                    width: "100%",
                    aspectRatio: "4/3",
                    backgroundImage: `url("${a.imageUrl}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundBlendMode: "multiply",
                    marginBottom: 12,
                  }}
                />
                <div
                  className="v1-kicker"
                  style={{ color: "var(--v1-red)", marginBottom: 6 }}
                >
                  {a.category}
                </div>
                <h4 className="v1-card-headline" style={{ marginBottom: 8 }}>
                  <a href="#">{a.headline}</a>
                </h4>
                <p
                  style={{
                    fontFamily: "var(--font-newsreader), Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 14,
                    lineHeight: 1.45,
                    color: "var(--v1-ink-medium)",
                  }}
                >
                  {a.dek}
                </p>
              </article>
            ))}
          </div>

          {/* DAILY CHALLENGE SIDEBAR */}
          <aside
            style={{
              border: "2px solid var(--v1-ink)",
              padding: "4px",
              alignSelf: "start",
              position: "sticky",
              top: 24,
            }}
          >
            <div
              style={{
                border: "1px solid var(--v1-gold)",
                padding: "20px 18px",
              }}
            >
              <div
                className="v1-kicker"
                style={{ textAlign: "center", marginBottom: 6 }}
              >
                The Future Express
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: 900,
                  fontSize: 26,
                  textAlign: "center",
                  margin: 0,
                  lineHeight: 1.05,
                }}
              >
                Daily Prediction Challenge
              </h3>
              <p
                style={{
                  textAlign: "center",
                  fontFamily: "var(--font-newsreader), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "var(--v1-ink-light)",
                  marginTop: 6,
                  marginBottom: 16,
                }}
              >
                {dailyChallenge.date}
              </p>
              <div
                style={{
                  width: 32,
                  height: 2,
                  background: "var(--v1-gold)",
                  margin: "0 auto 18px",
                }}
              />

              {/* RESULT */}
              <div
                style={{
                  borderTop: "3px double var(--v1-ink)",
                  borderBottom: "3px double var(--v1-ink)",
                  padding: "16px 0",
                  textAlign: "center",
                  marginBottom: 18,
                }}
              >
                <div className="v1-kicker" style={{ marginBottom: 6 }}>
                  Result
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-playfair), Georgia, serif",
                    fontWeight: 900,
                    fontSize: 56,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums lining-nums",
                  }}
                >
                  {dailyChallenge.totalScore}
                  <span
                    style={{
                      fontSize: 26,
                      color: "var(--v1-ink-light)",
                      fontStyle: "italic",
                      fontWeight: 700,
                    }}
                  >
                    /100
                  </span>
                </div>
                <div
                  className="v1-kicker"
                  style={{ marginTop: 6, color: "var(--v1-gold)" }}
                >
                  {dailyChallenge.rank}
                </div>
              </div>

              {/* Block grid */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 6,
                  marginBottom: 18,
                }}
              >
                {dailyChallenge.markets.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      background:
                        m.scoreBlock === "green"
                          ? "var(--v1-ink)"
                          : m.scoreBlock === "amber"
                            ? "#b45309"
                            : m.scoreBlock === "orange"
                              ? "var(--v1-red)"
                              : "var(--v1-red)",
                    }}
                  />
                ))}
              </div>

              {/* Box score */}
              <div style={{ marginBottom: 18 }}>
                {dailyChallenge.markets.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 8,
                      borderBottom: "1px solid var(--v1-rule)",
                      padding: "6px 0",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-newsreader), Georgia, serif",
                        fontStyle: "italic",
                        fontSize: 12,
                        color: "var(--v1-ink-medium)",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.category}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 12,
                        fontVariantNumeric: "tabular-nums lining-nums",
                      }}
                    >
                      {m.yourGuess}/{m.actual}
                    </span>
                  </div>
                ))}
              </div>

              <button
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  background: "var(--v1-ink)",
                  color: "var(--v1-paper)",
                  border: "2px solid var(--v1-ink)",
                  cursor: "pointer",
                }}
              >
                Share Results
              </button>
              <p
                style={{
                  fontFamily: "var(--font-newsreader), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 12,
                  color: "var(--v1-ink-light)",
                  textAlign: "center",
                  marginTop: 12,
                }}
              >
                Come back tomorrow for a new edition.
              </p>
            </div>
          </aside>
        </div>

        {/* CLASSIFIEDS FOOTER */}
        <div className="v1-rule-double" style={{ margin: "64px 0 24px" }} />
        <div
          style={{
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          <span className="v1-kicker">Classifieds · Subscriptions · Notices</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 24,
            paddingTop: 16,
            borderTop: "1px solid var(--v1-rule)",
          }}
        >
          {classifieds.map((c) => (
            <div key={c.title}>
              <div
                className="v1-kicker"
                style={{ color: "var(--v1-red)", marginBottom: 6 }}
              >
                {c.title}
              </div>
              <p
                style={{
                  fontFamily: "var(--font-newsreader), Georgia, serif",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "var(--v1-ink-medium)",
                  fontStyle: "italic",
                }}
              >
                {c.body}
              </p>
            </div>
          ))}
        </div>
        <p
          style={{
            textAlign: "center",
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--v1-ink-light)",
            marginTop: 32,
          }}
        >
          —— Printed by a machine that has read more newspapers than you. ——
        </p>
      </main>

      <style>{`
        @media (max-width: 800px) {
          .v1-secondary-grid { grid-template-columns: 1fr !important; }
          .v1-secondary-grid > div:first-child { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

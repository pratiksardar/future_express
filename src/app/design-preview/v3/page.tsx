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

export default function VariantThreePage() {
  const hero = articles[0];
  const reading = articles.slice(1, 4);
  const more = articles.slice(4);

  return (
    <div className="v3-root" id="v3-root">
      <Link href="/design-preview" className="preview-back">
        ← Back
      </Link>
      <EditionToggle rootSelector="#v3-root" />
      <span className="preview-chip">VARIANT 3</span>

      {/* MASTHEAD — minimal, italic wordmark */}
      <header
        style={{
          paddingTop: 32,
          paddingBottom: 24,
        }}
      >
        <div className="v3-container-wide">
          {/* Top thin meta strip */}
          <div
            className="v3-meta"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>VOL. {edition.volume} · NO. {edition.issue}</span>
            <span style={{ color: "var(--v3-gold)" }}>
              {edition.dateShort}
            </span>
            <span>The Independent Intelligence of the Future</span>
          </div>

          <div className="v3-hairline" style={{ margin: "20px 0" }} />

          {/* Wordmark */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <h1 className="v3-wordmark v3-reveal">
              The Future Express
            </h1>
            <p
              style={{
                fontFamily: "var(--font-newsreader), Georgia, serif",
                fontStyle: "italic",
                fontSize: 17,
                lineHeight: 1.4,
                color: "var(--v3-ink-light)",
                maxWidth: 280,
                margin: 0,
              }}
              className="v3-reveal v3-reveal-d1"
            >
              {edition.tagline}. A daily reading of what hasn't happened yet.
            </p>
          </div>

          <div className="v3-hairline" style={{ marginTop: 24 }} />

          {/* Section nav */}
          <nav
            className="v3-meta"
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              padding: "12px 0",
              borderBottom: "1px solid var(--v3-rule)",
            }}
          >
            {["Front Page", "Politics", "Markets", "Technology", "Sports", "Science", "Daily Challenge"].map((s) => (
              <a
                key={s}
                href="#"
                style={{
                  color: "var(--v3-ink-medium)",
                  textDecoration: "none",
                }}
              >
                {s}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* BREAKING TICKER — quiet inline strip */}
      <div
        style={{
          padding: "12px 24px",
          background: "var(--v3-paper-cream)",
        }}
      >
        <div
          className="v3-container-wide"
          style={{
            display: "flex",
            gap: 16,
            alignItems: "baseline",
            flexWrap: "wrap",
          }}
        >
          <span
            className="v3-meta"
            style={{
              color: "var(--v3-gold)",
              flexShrink: 0,
              fontWeight: 700,
            }}
          >
            EXTRA · EXTRA
          </span>
          <span
            style={{
              fontFamily: "var(--font-newsreader), Georgia, serif",
              fontStyle: "italic",
              fontSize: 15,
              color: "var(--v3-ink-medium)",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {breakingTicker}
          </span>
        </div>
      </div>

      <main>
        {/* HERO — single-column reading, image is restrained */}
        <section style={{ padding: "64px 24px 48px" }}>
          <div className="v3-container">
            <div
              className="v3-meta v3-reveal"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <span style={{ color: "var(--v3-gold)" }}>{hero.category}</span>
              <span>Issue No. {edition.issue} · 5 min read</span>
            </div>

            <h2 className="v3-hero-headline v3-reveal v3-reveal-d1" style={{ marginBottom: 24 }}>
              Markets now <strong>price a June rate cut</strong> as
              near-certain — even as the Fed insists otherwise.
            </h2>

            <p className="v3-dek v3-reveal v3-reveal-d2" style={{ marginBottom: 32 }}>
              {hero.dek}
            </p>

            <div
              className="v3-meta v3-reveal v3-reveal-d2"
              style={{
                display: "flex",
                gap: 16,
                color: "var(--v3-ink-light)",
                paddingBottom: 16,
                borderBottom: "1px solid var(--v3-rule)",
              }}
            >
              <span>{hero.byline}</span>
              <span>·</span>
              <span>April 25, 2026</span>
            </div>
          </div>

          {/* Hero image — wide, restrained */}
          <div
            className="v3-container-wide v3-reveal v3-reveal-d3"
            style={{ marginTop: 32 }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "21/9",
                backgroundImage: `url("${hero.imageUrl}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: 4,
                filter: "saturate(0.85)",
              }}
            />
            <p
              className="v3-meta"
              style={{
                marginTop: 8,
                color: "var(--v3-ink-light)",
                fontStyle: "italic",
                textTransform: "none",
                letterSpacing: 0,
                fontFamily: "var(--font-newsreader), Georgia, serif",
                fontSize: 13,
              }}
            >
              The Federal Reserve building, Washington, D.C. — Photograph: Newsroom archives.
            </p>
          </div>

          {/* Odds card + body excerpt */}
          <div className="v3-container" style={{ marginTop: 48 }}>
            <div className="v3-two-col">
              <div>
                <p
                  className="v3-body"
                  style={{ marginBottom: 20 }}
                >
                  Three soft inflation prints in a row have done what twelve
                  months of Federal Reserve rhetoric could not. The market is
                  convinced; the Committee, on the record, is not. Somewhere
                  between those two positions, $8.2&thinsp;million of capital has
                  already chosen sides — and the sides are not symmetric.
                </p>
                <p className="v3-body">
                  Polymarket's June rate-cut contract opened the year at
                  22&thinsp;cents. It traded through 40 in March, paused at the FOMC,
                  and broke 60 on Tuesday morning before the CPI release was
                  thirty seconds old.
                </p>
              </div>
              <aside className="v3-odds-card v3-reveal v3-reveal-d3">
                <div className="v3-meta" style={{ marginBottom: 8 }}>
                  The Odds
                </div>
                <div className="v3-odds-num">{hero.probability}%</div>
                <div
                  className="v3-meta"
                  style={{
                    color: "var(--v3-accent)",
                    marginTop: 4,
                  }}
                >
                  {hero.probabilityLabel}
                </div>
                <div
                  className="v3-hairline"
                  style={{ margin: "16px 0" }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 12,
                    fontVariantNumeric: "tabular-nums lining-nums",
                    color: "var(--v3-ink-light)",
                  }}
                >
                  <span>{hero.source}</span>
                  <span>VOL {hero.volume}</span>
                </div>
                <a
                  href="#"
                  className="v3-meta"
                  style={{
                    display: "inline-block",
                    marginTop: 16,
                    color: "var(--v3-accent)",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Trade on {hero.source} →
                </a>
              </aside>
            </div>
          </div>
        </section>

        <div className="v3-container">
          <div className="v3-hairline" />
        </div>

        {/* READING LIST — single column, generous spacing */}
        <section style={{ padding: "48px 24px" }}>
          <div className="v3-container">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 32,
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Today's Reading
              </h3>
              <span className="v3-meta">04 Articles</span>
            </div>
            <div className="v3-hairline" style={{ marginTop: 24 }} />

            {reading.map((a) => (
              <article key={a.slug} className="v3-card">
                <div
                  className="v3-meta"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <span style={{ color: "var(--v3-gold)" }}>{a.category}</span>
                  <span>{a.date} · {a.readTime}</span>
                </div>
                <h4 className="v3-card-headline" style={{ marginBottom: 10 }}>
                  <a href="#" style={{ color: "inherit", textDecoration: "none" }}>
                    {a.headline}
                  </a>
                </h4>
                <p
                  style={{
                    fontFamily: "var(--font-newsreader), Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 17,
                    lineHeight: 1.5,
                    color: "var(--v3-ink-medium)",
                    marginBottom: 16,
                  }}
                >
                  {a.dek}
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="v3-odds-pill">
                    <strong style={{ fontWeight: 700, color: "var(--v3-ink)" }}>
                      {a.probability}%
                    </strong>
                    <span style={{ color: "var(--v3-ink-light)" }}>
                      {a.probabilityLabel}
                    </span>
                  </span>
                  <span
                    className="v3-meta"
                    style={{ color: "var(--v3-ink-light)" }}
                  >
                    {a.source} · {a.volume}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* DAILY CHALLENGE — clean card, salon style */}
        <section
          style={{
            padding: "48px 24px",
            background: "var(--v3-paper-cream)",
            borderTop: "1px solid var(--v3-rule)",
            borderBottom: "1px solid var(--v3-rule)",
          }}
        >
          <div className="v3-container">
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <p
                className="v3-meta"
                style={{ color: "var(--v3-gold)", marginBottom: 8 }}
              >
                The Daily Edition
              </p>
              <h3
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: 700,
                  fontSize: "clamp(32px, 4vw, 48px)",
                  letterSpacing: "-0.015em",
                  margin: 0,
                  lineHeight: 1.05,
                }}
              >
                Prediction Challenge
              </h3>
              <p
                className="v3-meta"
                style={{ color: "var(--v3-ink-light)", marginTop: 8 }}
              >
                {dailyChallenge.date}
              </p>
              <div
                style={{
                  width: 24,
                  height: 1,
                  background: "var(--v3-gold)",
                  margin: "20px auto 0",
                }}
              />
            </div>

            {/* Score */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 32,
              }}
            >
              <p className="v3-meta" style={{ marginBottom: 8 }}>
                Result
              </p>
              <div
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontWeight: 900,
                  fontSize: "clamp(80px, 12vw, 144px)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.04em",
                  fontVariantNumeric: "tabular-nums lining-nums",
                }}
              >
                {dailyChallenge.totalScore}
                <span
                  style={{
                    fontSize: "0.4em",
                    color: "var(--v3-ink-light)",
                    fontWeight: 700,
                  }}
                >
                  /100
                </span>
              </div>
              <p
                className="v3-meta"
                style={{ color: "var(--v3-accent)", marginTop: 8 }}
              >
                {dailyChallenge.rank}
              </p>
            </div>

            {/* Block grid */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                marginBottom: 32,
              }}
            >
              {dailyChallenge.markets.map((m, i) => (
                <div
                  key={i}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 4,
                    background:
                      m.scoreBlock === "green"
                        ? "var(--v3-accent)"
                        : m.scoreBlock === "amber"
                          ? "#b8860b"
                          : "#c25450",
                  }}
                />
              ))}
            </div>

            {/* Box score */}
            <div
              style={{
                maxWidth: 540,
                margin: "0 auto 32px",
              }}
            >
              {dailyChallenge.markets.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 16,
                    alignItems: "baseline",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--v3-rule)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-newsreader), Georgia, serif",
                      fontStyle: "italic",
                      fontSize: 15,
                      color: "var(--v3-ink-medium)",
                    }}
                  >
                    {m.question}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 13,
                      color: "var(--v3-ink-light)",
                      fontVariantNumeric: "tabular-nums lining-nums",
                    }}
                  >
                    {m.yourGuess}% / {m.actual}%
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      color:
                        Math.abs(m.yourGuess - m.actual) <= 5
                          ? "var(--v3-accent)"
                          : "var(--v3-ink)",
                      fontVariantNumeric: "tabular-nums lining-nums",
                    }}
                  >
                    Δ{Math.abs(m.yourGuess - m.actual)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                style={{
                  padding: "12px 24px",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  background: "var(--v3-ink)",
                  color: "var(--v3-paper)",
                  border: "1px solid var(--v3-ink)",
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                Share Result
              </button>
              <button
                style={{
                  padding: "12px 24px",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  background: "transparent",
                  color: "var(--v3-ink)",
                  border: "1px solid var(--v3-rule-dark)",
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                Tomorrow's Edition
              </button>
            </div>
          </div>
        </section>

        {/* MORE STORIES */}
        <section style={{ padding: "48px 24px" }}>
          <div className="v3-container-wide">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 32,
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Also in this Edition
              </h3>
              <span className="v3-meta">Page 04</span>
            </div>
            <div className="v3-hairline" style={{ marginTop: 24, marginBottom: 32 }} />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 32,
              }}
            >
              {more.map((a) => (
                <article key={a.slug}>
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "5/3",
                      backgroundImage: `url("${a.imageUrl}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      borderRadius: 4,
                      marginBottom: 16,
                      filter: "saturate(0.85)",
                    }}
                  />
                  <div className="v3-meta" style={{ color: "var(--v3-gold)", marginBottom: 8 }}>
                    {a.category}
                  </div>
                  <h4 className="v3-card-headline" style={{ marginBottom: 10, fontSize: "clamp(20px, 1.8vw, 24px)" }}>
                    {a.headline}
                  </h4>
                  <p
                    style={{
                      fontFamily: "var(--font-newsreader), Georgia, serif",
                      fontStyle: "italic",
                      fontSize: 15,
                      lineHeight: 1.5,
                      color: "var(--v3-ink-medium)",
                      marginBottom: 12,
                    }}
                  >
                    {a.dek}
                  </p>
                  <span className="v3-odds-pill">
                    <strong style={{ fontWeight: 700, color: "var(--v3-ink)" }}>
                      {a.probability}%
                    </strong>
                    <span style={{ color: "var(--v3-ink-light)" }}>
                      {a.source}
                    </span>
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CLASSIFIEDS — quiet footer */}
        <footer
          style={{
            padding: "48px 24px 64px",
            borderTop: "1px solid var(--v3-rule)",
          }}
        >
          <div className="v3-container">
            <p
              className="v3-meta"
              style={{
                textAlign: "center",
                color: "var(--v3-gold)",
                marginBottom: 24,
                letterSpacing: "0.32em",
              }}
            >
              ── Classifieds ──
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 24,
              }}
            >
              {classifieds.map((c) => (
                <div key={c.title}>
                  <div
                    className="v3-meta"
                    style={{ color: "var(--v3-ink-light)", marginBottom: 6 }}
                  >
                    {c.title}
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-newsreader), Georgia, serif",
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: "var(--v3-ink-medium)",
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
                fontFamily: "var(--font-playfair), Georgia, serif",
                fontStyle: "italic",
                fontSize: 15,
                color: "var(--v3-ink-light)",
                textAlign: "center",
                marginTop: 48,
              }}
            >
              The Future Express · Vol. {edition.volume} · No. {edition.issue} · {edition.date}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

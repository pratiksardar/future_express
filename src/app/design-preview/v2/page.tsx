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

export default function VariantTwoPage() {
  const hero = articles[0];
  const trio = articles.slice(1, 4);
  const more = articles.slice(4);

  return (
    <div className="v2-root" id="v2-root">
      <Link href="/design-preview" className="preview-back">
        ← Back
      </Link>
      <EditionToggle rootSelector="#v2-root" />
      <span className="preview-chip">VARIANT 2</span>

      {/* MASTHEAD — brutalist block layout */}
      <header>
        <div className="v2-thick-rule" />
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "16px 24px",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "end",
            gap: 16,
          }}
        >
          <div className="v2-meta">
            <div>VOL. {edition.volume}</div>
            <div>NO. {edition.issue}</div>
          </div>
          <div
            className="v2-meta"
            style={{ textAlign: "center", color: "var(--v2-red)" }}
          >
            {edition.dateShort}
          </div>
          <div
            className="v2-meta"
            style={{ textAlign: "right" }}
          >
            <div>{edition.price}</div>
            <div>{edition.city}</div>
          </div>
        </div>
        <div className="v2-medium-rule" />

        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "0 24px",
          }}
        >
          <h1 className="v2-masthead-wordmark">
            FUTURE
            <br />
            EXPRESS
          </h1>
        </div>
        <div className="v2-thick-rule" />
      </header>

      {/* BREAKING TICKER — black bar, no scroll, declarative */}
      <div
        style={{
          background: "var(--v2-ink)",
          color: "var(--v2-paper)",
          padding: "14px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            display: "flex",
            gap: 24,
            alignItems: "baseline",
            flexWrap: "wrap",
          }}
        >
          <span
            className="v2-meta"
            style={{
              background: "var(--v2-red)",
              color: "var(--v2-paper)",
              padding: "4px 8px",
              flexShrink: 0,
              letterSpacing: "0.24em",
            }}
          >
            STOP THE PRESSES
          </span>
          <span
            style={{
              fontFamily: "var(--font-newsreader), Georgia, serif",
              fontSize: 15,
              fontStyle: "italic",
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

      <main style={{ maxWidth: 1440, margin: "0 auto" }}>
        {/* HERO — asymmetric, type as art */}
        <section
          className="v2-asymmetric"
          style={{ borderBottom: "8px solid var(--v2-rule)" }}
        >
          <div
            style={{
              padding: "48px 32px",
              borderRight: "3px solid var(--v2-rule)",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
            className="v2-hero-left"
          >
            <div
              className="v2-meta"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  background: "var(--v2-red)",
                  color: "var(--v2-paper)",
                  padding: "4px 10px",
                }}
              >
                {hero.category}
              </span>
              <span style={{ color: "var(--v2-ink-light)" }}>
                Front Page · 01
              </span>
            </div>

            <h2 className="v2-hero-headline">
              Markets Now Price a June Rate Cut as <em>Near-Certain</em> — Even
              as the Fed Insists Otherwise.
            </h2>

            <p className="v2-dek">{hero.dek}</p>

            <div
              className="v2-meta"
              style={{
                color: "var(--v2-ink-light)",
                paddingTop: 16,
                borderTop: "1px solid var(--v2-rule)",
              }}
            >
              {hero.byline} · {hero.date} · {hero.readTime}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "4/3",
                backgroundImage: `url("${hero.imageUrl}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "grayscale(0.6) contrast(1.15)",
              }}
            />
            {/* Odds — the inked black block */}
            <div className="v2-odds-block" style={{ padding: "32px 24px" }}>
              <div
                className="v2-meta"
                style={{ color: "var(--v2-yellow)" }}
              >
                The Odds
              </div>
              <div className="v2-odds-num">{hero.probability}%</div>
              <div
                className="v2-meta"
                style={{ color: "var(--v2-yellow)", marginTop: -4 }}
              >
                {hero.probabilityLabel}
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid color-mix(in srgb, var(--v2-paper) 30%, transparent)",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 12,
                  fontVariantNumeric: "tabular-nums lining-nums",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{hero.source}</span>
                <span>VOL {hero.volume}</span>
              </div>
              <a
                href="#"
                className="v2-meta"
                style={{
                  marginTop: 16,
                  color: "var(--v2-paper)",
                  textDecoration: "none",
                  borderBottom: "2px solid var(--v2-yellow)",
                  paddingBottom: 4,
                  width: "fit-content",
                }}
              >
                Trade {hero.source} →
              </a>
            </div>
          </div>
        </section>

        {/* THREE-COLUMN STRIP */}
        <section className="v2-three-col" style={{ borderTop: 0 }}>
          {trio.map((a, i) => (
            <article key={a.slug}>
              <div
                className="v2-meta"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <span style={{ color: "var(--v2-red)" }}>{a.category}</span>
                <span style={{ color: "var(--v2-ink-light)" }}>
                  0{i + 2}
                </span>
              </div>
              <h3 className="v2-card-headline" style={{ marginBottom: 12 }}>
                <a
                  href="#"
                  className="v2-link"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {a.headline}
                </a>
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-newsreader), Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 15,
                  lineHeight: 1.4,
                  color: "var(--v2-ink-medium)",
                  marginBottom: 16,
                }}
              >
                {a.dek}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  paddingTop: 12,
                  borderTop: "1px solid var(--v2-rule)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-playfair), Georgia, serif",
                    fontWeight: 900,
                    fontSize: 32,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums lining-nums",
                  }}
                >
                  {a.probability}%
                </span>
                <span
                  className="v2-meta"
                  style={{ color: "var(--v2-ink-light)" }}
                >
                  {a.probabilityLabel} · {a.source}
                </span>
              </div>
            </article>
          ))}
        </section>

        {/* DAILY CHALLENGE — yellow block hero */}
        <section
          style={{
            borderBottom: "8px solid var(--v2-rule)",
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
          }}
          className="v2-challenge-grid"
        >
          <div
            className="v2-yellow-block"
            style={{
              padding: "48px 32px",
              borderRight: "3px solid var(--v2-rule)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 32,
            }}
          >
            <div>
              <div className="v2-meta" style={{ marginBottom: 16 }}>
                Edition · {dailyChallenge.date}
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontWeight: 900,
                  fontSize: "clamp(40px, 5vw, 72px)",
                  lineHeight: 0.92,
                  letterSpacing: "-0.03em",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                Daily
                <br />
                Prediction
                <br />
                Challenge
              </h3>
            </div>
            <div>
              <div
                className="v2-meta"
                style={{ marginBottom: 8 }}
              >
                Today's Score
              </div>
              <div
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontWeight: 900,
                  fontSize: "clamp(80px, 12vw, 200px)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.04em",
                  fontVariantNumeric: "tabular-nums lining-nums",
                }}
              >
                {dailyChallenge.totalScore}
                <span style={{ fontSize: "0.4em", color: "var(--v2-ink-medium)" }}>
                  /100
                </span>
              </div>
              <div
                className="v2-meta"
                style={{
                  marginTop: 8,
                  background: "var(--v2-ink)",
                  color: "var(--v2-yellow)",
                  display: "inline-block",
                  padding: "4px 10px",
                }}
              >
                {dailyChallenge.rank}
              </div>
            </div>
          </div>

          <div style={{ padding: "48px 32px" }}>
            {/* Block grid */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 32,
              }}
            >
              {dailyChallenge.markets.map((m, i) => (
                <div
                  key={i}
                  style={{
                    width: 56,
                    height: 56,
                    background:
                      m.scoreBlock === "green"
                        ? "var(--v2-ink)"
                        : m.scoreBlock === "amber"
                          ? "var(--v2-yellow)"
                          : "var(--v2-red)",
                    border:
                      m.scoreBlock === "amber"
                        ? "3px solid var(--v2-ink)"
                        : "none",
                  }}
                />
              ))}
            </div>

            {/* Box score */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: 24,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "3px solid var(--v2-rule)" }}>
                  <th
                    className="v2-meta"
                    style={{ textAlign: "left", padding: "8px 0" }}
                  >
                    Category
                  </th>
                  <th
                    className="v2-meta"
                    style={{ textAlign: "right", padding: "8px 0" }}
                  >
                    You
                  </th>
                  <th
                    className="v2-meta"
                    style={{ textAlign: "right", padding: "8px 0" }}
                  >
                    Market
                  </th>
                  <th
                    className="v2-meta"
                    style={{ textAlign: "right", padding: "8px 0" }}
                  >
                    Δ
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailyChallenge.markets.map((m, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid var(--v2-rule)" }}
                  >
                    <td
                      style={{
                        padding: "12px 0",
                        fontFamily: "var(--font-playfair), Georgia, serif",
                        fontWeight: 700,
                        fontSize: 16,
                        textTransform: "uppercase",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {m.category}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontVariantNumeric: "tabular-nums lining-nums",
                      }}
                    >
                      {m.yourGuess}%
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontVariantNumeric: "tabular-nums lining-nums",
                      }}
                    >
                      {m.actual}%
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums lining-nums",
                        color:
                          Math.abs(m.yourGuess - m.actual) <= 5
                            ? "var(--v2-ink)"
                            : "var(--v2-red)",
                      }}
                    >
                      {Math.abs(m.yourGuess - m.actual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              style={{
                width: "100%",
                padding: "16px 24px",
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                background: "var(--v2-ink)",
                color: "var(--v2-paper)",
                border: 0,
                cursor: "pointer",
              }}
            >
              SHARE THE BOX SCORE →
            </button>
          </div>
        </section>

        {/* MORE STORIES STRIP */}
        <section style={{ padding: "48px 24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 24,
            }}
          >
            <h3
              className="v2-card-headline"
              style={{ fontSize: "clamp(28px, 3vw, 44px)", margin: 0 }}
            >
              More Stories
            </h3>
            <span className="v2-meta" style={{ color: "var(--v2-ink-light)" }}>
              Continued · Page 04
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {more.map((a) => (
              <article key={a.slug} className="v2-card">
                <div
                  className="v2-meta"
                  style={{ color: "var(--v2-red)", marginBottom: 12 }}
                >
                  {a.category}
                </div>
                <h4 className="v2-card-headline" style={{ marginBottom: 12, fontSize: "clamp(20px, 2vw, 26px)" }}>
                  {a.headline}
                </h4>
                <p
                  style={{
                    fontFamily: "var(--font-newsreader), Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 14,
                    color: "var(--v2-ink-medium)",
                    lineHeight: 1.4,
                    marginBottom: 16,
                  }}
                >
                  {a.dek}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 12,
                    borderTop: "3px solid var(--v2-rule)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-playfair), Georgia, serif",
                      fontWeight: 900,
                      fontSize: 28,
                      fontVariantNumeric: "tabular-nums lining-nums",
                    }}
                  >
                    {a.probability}%
                  </span>
                  <span
                    className="v2-meta"
                    style={{ color: "var(--v2-ink-light)" }}
                  >
                    {a.source}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CLASSIFIEDS */}
        <section
          style={{
            background: "var(--v2-ink)",
            color: "var(--v2-paper)",
            padding: "48px 32px",
          }}
        >
          <div
            className="v2-meta"
            style={{
              color: "var(--v2-yellow)",
              textAlign: "center",
              marginBottom: 32,
              letterSpacing: "0.32em",
            }}
          >
            ─── CLASSIFIEDS ───
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 32,
              maxWidth: 1100,
              margin: "0 auto",
            }}
          >
            {classifieds.map((c) => (
              <div
                key={c.title}
                style={{
                  borderTop: "1px solid color-mix(in srgb, var(--v2-paper) 30%, transparent)",
                  paddingTop: 16,
                }}
              >
                <div
                  className="v2-meta"
                  style={{ color: "var(--v2-yellow)", marginBottom: 8 }}
                >
                  {c.title}
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-newsreader), Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "var(--v2-ink-medium)",
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
              fontWeight: 900,
              fontSize: "clamp(40px, 6vw, 88px)",
              textTransform: "uppercase",
              letterSpacing: "-0.03em",
              textAlign: "center",
              marginTop: 64,
              marginBottom: 0,
              color: "var(--v2-yellow)",
              lineHeight: 0.95,
            }}
          >
            END · OF · EDITION
          </p>
        </section>
      </main>

      <style>{`
        @media (max-width: 900px) {
          .v2-hero-left { border-right: 0 !important; border-bottom: 3px solid var(--v2-rule); }
          .v2-challenge-grid { grid-template-columns: 1fr !important; }
          .v2-challenge-grid > div:first-child { border-right: 0 !important; border-bottom: 3px solid var(--v2-rule); }
        }
      `}</style>
    </div>
  );
}

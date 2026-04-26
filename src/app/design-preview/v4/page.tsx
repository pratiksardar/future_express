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
import WireDispatchCursor from "./WireDispatchCursor";
import PressOrnament from "./PressOrnament";

export default function VariantFourPage() {
  const hero = articles[0];
  const sidebarLeads = articles.slice(1, 4);
  const more = articles.slice(4);

  // Build progress bar for odds widget — 24 chars wide
  const buildBar = (pct: number, width = 24) => {
    const filled = Math.round((pct / 100) * width);
    return "━".repeat(filled) + "░".repeat(Math.max(0, width - filled));
  };

  // ASCII odds box — every interior row is exactly 29 cols between │ │
  // (= 31 chars total). Box-drawing alignment is fatal if off-by-one,
  // so the format strings are exact and the right-edge is locked.
  const oddsBox = [
    "┌─── MARKET ODDS ─────────────┐",
    "│                             │",
    `│   ${String(hero.probability).padStart(2, " ")}%                       │`,
    `│   ${buildBar(hero.probability)}  │`,
    `│   ${hero.probabilityLabel.toUpperCase().padEnd(25, " ")} │`,
    "│                             │",
    `│   ${hero.source.toUpperCase().padEnd(25, " ")} │`,
    `│   VOL: ${hero.volume.padEnd(20, " ")} │`,
    `│   TRADERS: 1,247            │`,
    "└─────────────────────────────┘",
  ];

  const challengePct = dailyChallenge.totalScore;
  const challengeBlocks = dailyChallenge.markets
    .map((m) => (m.scoreBlock === "green" || m.scoreBlock === "amber" ? "[█]" : "[░]"))
    .join("");

  return (
    <div className="v4-root preview-v4 v4-paper-bg" id="v4-root">
      <Link href="/design-preview" className="preview-back">
        ← Back
      </Link>
      <EditionToggle rootSelector="#v4-root" />
      <span className="preview-chip v4-chip-mono">VARIANT 4</span>

      {/* ABOVE-FOLD IDENTITY STRIP — surfaces the autonomous-agent narrative immediately
          per CMO + marketing review consensus: wallet is brand-defining, was buried below fold */}
      <div className="v4-identity-strip" aria-label="Autonomous editor identity">
        <span>▶ AGENT editor@futureexpress.eth</span>
        <span className="v4-identity-balance">BALANCE 0.034 ETH · BASE</span>
        <span>HEDERA TX · 0.0.4928421@1714169643</span>
      </div>

      {/* MASTHEAD */}
      <header style={{ padding: "32px 24px 16px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }}>
          {/* Press ornament — top-right */}
          <div className="v4-press-ornament" aria-hidden="true">
            <PressOrnament />
          </div>

          {/* Top meta row */}
          <div
            className="v4-kicker"
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span>{edition.dateShort} · {edition.city}</span>
            <span
              style={{
                fontStyle: "italic",
                textTransform: "none",
                letterSpacing: 0,
                fontFamily: "var(--font-sub)",
                fontSize: 13,
                color: "var(--color-ink-medium)",
              }}
            >
              {edition.strapline}
            </span>
            <span>VOL. {edition.volume} · NO. {edition.issue}</span>
          </div>

          <div className="v4-cartouche">
            <div className="v4-cartouche-inner">
              <h1 className="v4-wordmark">The Future Express</h1>
              <p
                style={{
                  textAlign: "center",
                  marginTop: 12,
                  fontFamily: "var(--font-sub)",
                  fontStyle: "italic",
                  fontSize: 16,
                  color: "var(--color-ink-medium)",
                }}
              >
                {edition.tagline}
              </p>

              {/* Wire dispatch line */}
              <div className="v4-wire-dispatch">
                <WireDispatchCursor
                  prefix={`▶ VOL ${edition.volume} · NO ${edition.issue} · DISPATCH READY · 2026-04-26 22:14 UTC `}
                />
              </div>
            </div>
          </div>

          {/* Bottom meta row */}
          <div
            className="v4-kicker"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 14,
              borderTop: "1px solid var(--color-ink)",
              borderBottom: "1px solid var(--color-ink)",
              padding: "8px 0",
            }}
          >
            <span>{edition.price}</span>
            <span style={{ color: "var(--color-accent-gold)" }}>
              POLYMARKET · KALSHI · LIVE
            </span>
            <span>SUNDAY EDITION</span>
          </div>
        </div>
      </header>

      {/* BREAKING TICKER */}
      <div className="v4-ticker-wrap">
        <div className="v4-ticker-inner">
          <span className="v4-ticker-prefix" aria-hidden="true">
            ►
          </span>
          <span className="v4-kicker v4-ticker-extra">EXTRA · EXTRA</span>
          <span className="v4-ticker-text">{breakingTicker}</span>
          <span className="v4-ticker-cursor" aria-hidden="true">
            ▍
          </span>
        </div>
      </div>

      {/* HERO */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 64px" }}>
        <div className="v4-five-col" style={{ marginTop: 8 }}>
          <article>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 16,
              }}
            >
              <span className="v4-kicker" style={{ color: "var(--color-accent-red)" }}>
                {hero.category}
              </span>
              <span className="v4-kicker">
                Front Page · Vol. {edition.volume}, No. {edition.issue}
              </span>
            </div>
            <div className="v4-rule-double" style={{ marginBottom: 20 }} />

            <h2 className="v4-hero-headline" style={{ marginBottom: 18 }}>
              {hero.headline}
            </h2>
            <p className="v4-hero-dek" style={{ marginBottom: 18 }}>
              {hero.dek}
            </p>

            <div
              className="v4-kicker"
              style={{ marginBottom: 6, color: "var(--color-ink-medium)" }}
            >
              {hero.byline} · {hero.date} · {hero.readTime}
            </div>

            {/* Filed monospace line */}
            <div className="v4-filed">
              FILED 2026-04-26 22:14:03 UTC · AGENT editor@futureexpress · CONFIDENCE 0.86
            </div>

            <div
              className="v4-rule-thin"
              style={{ marginTop: 16, marginBottom: 18, opacity: 0.6 }}
            />

            <div className="v4-hero-grid">
              <div>
                <div
                  className="v4-halftone"
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
                    fontFamily: "var(--font-sub)",
                    fontStyle: "italic",
                    fontSize: 13,
                    color: "var(--color-ink-light)",
                  }}
                >
                  Photograph: Newsroom archives · Treated halftone
                </p>

                <div style={{ marginTop: 24 }}>
                  <p
                    className="v4-dropcap"
                    style={{
                      fontFamily: "var(--font-sub)",
                      fontSize: 17,
                      lineHeight: 1.65,
                      color: "var(--color-ink-medium)",
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
                      fontFamily: "var(--font-sub)",
                      fontSize: 17,
                      lineHeight: 1.65,
                      color: "var(--color-ink-medium)",
                    }}
                  >
                    Polymarket&apos;s June rate-cut contract opened the year at 22
                    cents. It traded through 40 in March, paused at the FOMC, and
                    broke 60 on Tuesday morning before the CPI release was thirty
                    seconds old.
                  </p>
                </div>
              </div>

              {/* ASCII Odds Widget — THE BIG TREATMENT */}
              <aside>
                <pre className="v4-odds-ascii" aria-label="Market odds">
                  {oddsBox.map((line, i) => {
                    if (i === 2) {
                      // Highlight the percentage line
                      return (
                        <span key={i}>
                          <span>{"│   "}</span>
                          <span className="v4-odds-pct">
                            {String(hero.probability).padStart(2, " ")}%
                          </span>
                          <span>{"                       │\n"}</span>
                        </span>
                      );
                    }
                    if (i === 3) {
                      return (
                        <span key={i} className="v4-odds-bar-line">
                          {line + "\n"}
                        </span>
                      );
                    }
                    if (i >= 6 && i <= 8) {
                      return (
                        <span key={i} className="v4-odds-meta">
                          {line + "\n"}
                        </span>
                      );
                    }
                    return <span key={i}>{line + "\n"}</span>;
                  })}
                </pre>
                <div className="v4-odds-cta">
                  ► TRADE ON {hero.source.toUpperCase()}
                </div>
              </aside>
            </div>
          </article>

          {/* Sidebar leads */}
          {sidebarLeads.map((a) => (
            <aside key={a.slug} className="v4-column-rule">
              <div
                className="v4-kicker"
                style={{ color: "var(--color-accent-red)", marginBottom: 8 }}
              >
                {a.category}
              </div>
              <h3 className="v4-card-headline" style={{ marginBottom: 10 }}>
                <a href="#">{a.headline}</a>
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-sub)",
                  fontStyle: "italic",
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: "var(--color-ink-medium)",
                  marginBottom: 14,
                }}
              >
                {a.dek}
              </p>
              <div className="v4-ascii-rule">
                {`───[ ${a.category.toUpperCase()} · ${a.probability}% ]──────────`}
              </div>
              <div className="v4-card-source">{a.source} · {a.volume}</div>
            </aside>
          ))}
        </div>

        {/* SECTION RULE */}
        <div className="v4-rule-double" style={{ margin: "48px 0 32px" }} />
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
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontStyle: "italic",
              fontSize: 28,
              margin: 0,
            }}
          >
            More from the Editions
          </h3>
          <span className="v4-kicker">Continued · Page 2</span>
        </div>
        <div className="v4-rule-thin" style={{ marginBottom: 24 }} />

        {/* SECONDARY GRID + CHALLENGE */}
        <div className="v4-secondary-grid">
          <div className="v4-cards-grid">
            {more.map((a) => (
              <article key={a.slug} className="v4-secondary-card">
                <div
                  className="v4-halftone"
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
                <h4 className="v4-card-headline" style={{ marginBottom: 8 }}>
                  <a href="#">{a.headline}</a>
                </h4>
                <p
                  style={{
                    fontFamily: "var(--font-sub)",
                    fontStyle: "italic",
                    fontSize: 14,
                    lineHeight: 1.45,
                    color: "var(--color-ink-medium)",
                    marginBottom: 12,
                  }}
                >
                  {a.dek}
                </p>
                <div className="v4-ascii-rule">
                  {`───[ ${a.category.toUpperCase()} · ${a.probability}% ]──────────`}
                </div>
                <div className="v4-card-source">{a.source} · {a.volume}</div>
              </article>
            ))}
          </div>

          {/* DAILY CHALLENGE — both views */}
          <aside className="v4-challenge-stack">
            {/* Editorial view */}
            <div className="v4-challenge-card">
              <div className="v4-kicker" style={{ textAlign: "center", marginBottom: 6 }}>
                The Future Express
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
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
                  fontFamily: "var(--font-sub)",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "var(--color-ink-light)",
                  marginTop: 6,
                  marginBottom: 16,
                }}
              >
                {dailyChallenge.date}
              </p>
              <div className="v4-gold-dash" />

              <div
                style={{
                  borderTop: "3px double var(--color-ink)",
                  borderBottom: "3px double var(--color-ink)",
                  padding: "16px 0",
                  textAlign: "center",
                  marginBottom: 18,
                }}
              >
                <div className="v4-kicker" style={{ marginBottom: 6 }}>
                  Result
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
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
                      color: "var(--color-ink-light)",
                      fontStyle: "italic",
                      fontWeight: 700,
                    }}
                  >
                    /100
                  </span>
                </div>
                <div
                  className="v4-kicker"
                  style={{ marginTop: 6, color: "var(--color-accent-gold)" }}
                >
                  {dailyChallenge.rank}
                </div>
              </div>

              {/* CSS-square block grid */}
              <div className="v4-block-grid">
                {dailyChallenge.markets.map((m, i) => (
                  <div
                    key={i}
                    className="v4-block"
                    data-tier={
                      m.scoreBlock === "green"
                        ? "hit"
                        : m.scoreBlock === "amber"
                          ? "warm"
                          : m.scoreBlock === "orange"
                            ? "cool"
                            : "miss"
                    }
                  />
                ))}
              </div>
            </div>

            {/* Wire view — ASCII */}
            <pre className="v4-challenge-wire" aria-label="Wire dispatch view">
{`DAILY CHALLENGE · 2026-04-26
─────────────────────────────
${challengeBlocks}   SCORE: ${challengePct}%
─────────────────────────────
> SHARE THIS DISPATCH ▍`}
            </pre>
          </aside>
        </div>

        {/* AGENT SIGNATURE FOOTER */}
        <div className="v4-rule-double" style={{ margin: "48px 0 24px" }} />
        <pre className="v4-agent-sig" aria-label="Agent signature">
{`─────────────────────────────────────────────
END OF DISPATCH
AGENT:     editor@futureexpress.eth
WALLET:    0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9
BALANCE:   0.034 ETH (Base mainnet)
PUBLISHED: 2026-04-26 22:14:03 UTC
HEDERA TX: 0.0.4928421@1714169643.391284561
─────────────────────────────────────────────`}
        </pre>

        {/* CLASSIFIEDS */}
        <div className="v4-rule-double" style={{ margin: "48px 0 24px" }} />
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span className="v4-kicker">Classifieds · Subscriptions · Notices</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 24,
            paddingTop: 16,
            borderTop: "1px solid var(--color-rule)",
          }}
        >
          {classifieds.map((c, i) => (
            <div key={c.title}>
              {i === 0 ? (
                <pre className="v4-classified-mono">
{`> SEEKING: Polymarket researcher.
> Apply to ai@futureexpress`}
                </pre>
              ) : (
                <>
                  <div
                    className="v4-kicker"
                    style={{ color: "var(--color-accent-red)", marginBottom: 6 }}
                  >
                    {c.title}
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-sub)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "var(--color-ink-medium)",
                      fontStyle: "italic",
                    }}
                  >
                    {c.body}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
        <p
          style={{
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--color-ink-light)",
            marginTop: 32,
          }}
        >
          —— Printed by a machine that has read more newspapers than you. ——
        </p>
      </main>
    </div>
  );
}

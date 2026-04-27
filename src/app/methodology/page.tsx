import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  articles,
  markets,
  marketAccuracy,
} from "@/lib/db/schema";
import { eq, desc, and, isNotNull, asc } from "drizzle-orm";
import { Masthead } from "@/components/Masthead";
import { SectionNav } from "@/components/SectionNav";
import { CitationCopyButton } from "@/components/CitationCopyButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = "https://thefutureexpress.com";
const PAGE_URL = `${SITE_URL}/methodology`;

export function generateMetadata(): Metadata {
  return {
    title: "Methodology — How The Future Express Measures Accuracy",
    description:
      "Brier scores, calibration plots, sources, model stack, limitations. The cite-able transparency dossier for The Future Express, the autonomous prediction-market newspaper.",
    alternates: { canonical: "/methodology" },
    openGraph: {
      title: "Methodology — The Future Express",
      description:
        "How we score forecasts, where the data comes from, what we don't claim to do. Built for journalists and finance pros.",
      url: PAGE_URL,
      type: "article",
    },
    robots: { index: true, follow: true },
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  politics: "Politics",
  economy: "Economy",
  crypto: "Crypto",
  sports: "Sports",
  science: "Science",
  entertainment: "Entertainment",
  world: "World",
};

const CATEGORY_ORDER = [
  "politics",
  "economy",
  "crypto",
  "sports",
  "science",
  "entertainment",
  "world",
];

// ── Calibration bucketing ──────────────────────────────────────────────────

const BUCKET_COUNT = 10;
const MIN_BUCKET_N = 5;

type ResolvedRow = {
  articleId: string;
  slug: string;
  headline: string;
  category: string;
  probabilityAtPublish: string | null;
  resolutionOutcome: string | null;
  brierScore: string | null;
};

type Bucket = {
  /** Inclusive lower edge (0–9 indexes 0%, 10%, ..., 90%). */
  lo: number;
  /** Exclusive upper edge for buckets 0–8, inclusive for bucket 9. */
  hi: number;
  count: number;
  yesCount: number;
  /** Mean predicted probability inside the bucket (0..1). */
  meanForecast: number;
  /** Empirical frequency of yes outcomes (0..1). */
  empirical: number;
};

function buildBuckets(rows: ResolvedRow[]): Bucket[] {
  const buckets: Bucket[] = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    lo: i * 10,
    hi: i === BUCKET_COUNT - 1 ? 100 : (i + 1) * 10,
    count: 0,
    yesCount: 0,
    meanForecast: 0,
    empirical: 0,
  }));

  const sums = buckets.map(() => 0);

  for (const r of rows) {
    if (r.probabilityAtPublish == null || r.resolutionOutcome == null) continue;
    const p = Number(r.probabilityAtPublish);
    if (Number.isNaN(p)) continue;
    const idx = Math.min(Math.floor(p / 10), BUCKET_COUNT - 1);
    const b = buckets[idx];
    b.count++;
    sums[idx] += p;
    if (r.resolutionOutcome.toLowerCase() === "yes") b.yesCount++;
  }

  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    if (b.count > 0) {
      b.meanForecast = sums[i] / b.count / 100;
      b.empirical = b.yesCount / b.count;
    }
  }
  return buckets;
}

// ── Per-category aggregates ────────────────────────────────────────────────

type CategoryStat = {
  category: string;
  resolvedCount: number;
  meanBrier: number | null;
  best: { headline: string; slug: string; brier: number } | null;
  worst: { headline: string; slug: string; brier: number } | null;
};

function buildCategoryStats(rows: ResolvedRow[]): CategoryStat[] {
  const groups: Record<string, ResolvedRow[]> = {};
  for (const r of rows) {
    if (r.brierScore == null) continue;
    (groups[r.category] ??= []).push(r);
  }

  const out: CategoryStat[] = [];
  for (const cat of CATEGORY_ORDER) {
    const list = groups[cat] ?? [];
    if (list.length === 0) {
      out.push({
        category: cat,
        resolvedCount: 0,
        meanBrier: null,
        best: null,
        worst: null,
      });
      continue;
    }
    const briers = list.map((r) => Number(r.brierScore));
    const mean = briers.reduce((s, b) => s + b, 0) / briers.length;
    const sorted = [...list].sort(
      (a, b) => Number(a.brierScore) - Number(b.brierScore)
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    out.push({
      category: cat,
      resolvedCount: list.length,
      meanBrier: mean,
      best: {
        headline: best.headline,
        slug: best.slug,
        brier: Number(best.brierScore),
      },
      worst: {
        headline: worst.headline,
        slug: worst.slug,
        brier: Number(worst.brierScore),
      },
    });
  }
  return out;
}

// ── ASCII score band (random | FE | perfect) ──────────────────────────────

function buildScoreBand(brier: number | null): string {
  // 41-character mono band. 0.00 (perfect) at left, 0.25 (random) at right.
  // We intentionally cap at 0.25 — anything worse than random gets pinned.
  const WIDTH = 41;
  const RANDOM = 0.25;
  const fePos =
    brier == null
      ? -1
      : Math.max(0, Math.min(WIDTH - 1, Math.round((brier / RANDOM) * (WIDTH - 1))));
  const cells: string[] = [];
  for (let i = 0; i < WIDTH; i++) {
    if (i === 0) cells.push("●"); // perfect
    else if (i === WIDTH - 1) cells.push("●"); // random
    else if (i === fePos) cells.push("◆"); // future express
    else cells.push("─");
  }
  return cells.join("");
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function MethodologyPage() {
  let resolved: ResolvedRow[] = [];
  let totalArticleCount = 0;
  let trackedMarketCount = 0;

  try {
    const rows = await db
      .select({
        articleId: articles.id,
        slug: articles.slug,
        headline: articles.headline,
        category: articles.category,
        probabilityAtPublish: marketAccuracy.probabilityAtPublish,
        resolutionOutcome: marketAccuracy.resolutionOutcome,
        brierScore: marketAccuracy.brierScore,
      })
      .from(marketAccuracy)
      .innerJoin(articles, eq(marketAccuracy.articleId, articles.id))
      .where(
        and(
          eq(marketAccuracy.status, "resolved"),
          isNotNull(marketAccuracy.brierScore),
          isNotNull(marketAccuracy.probabilityAtPublish),
          isNotNull(marketAccuracy.resolutionOutcome)
        )
      )
      .orderBy(asc(marketAccuracy.brierScore));
    resolved = rows;

    // Headline counts (best-effort; failure is non-fatal)
    const [totalArticles] = await db
      .select({ id: articles.id })
      .from(articles)
      .limit(1)
      .then(async () => {
        const all = await db.select({ id: articles.id }).from(articles);
        return [{ id: String(all.length) }];
      });
    totalArticleCount = Number(totalArticles?.id ?? 0);

    const tracked = await db
      .select({ id: markets.id })
      .from(markets)
      .where(eq(markets.status, "active"));
    trackedMarketCount = tracked.length;
  } catch {
    // Tables may not exist yet — render the methodology with placeholders.
  }

  const totalResolved = resolved.length;
  const meanBrier =
    totalResolved > 0
      ? resolved.reduce((s, r) => s + Number(r.brierScore), 0) / totalResolved
      : null;

  const buckets = buildBuckets(resolved);
  const categoryStats = buildCategoryStats(resolved);
  const scoreBand = buildScoreBand(meanBrier);

  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);

  const citationPlain = `The Future Express, retrieved ${isoDate}, ${PAGE_URL}`;
  const citationAcademic = `The Future Express. (${today.getUTCFullYear()}). Methodology. Retrieved from ${PAGE_URL}`;
  const citationMarkdown = `[The Future Express — Methodology](${PAGE_URL})`;

  return (
    <div className="paper-texture min-h-screen">
      <Masthead compact />
      <SectionNav />

      <main className="max-w-[var(--max-width)] mx-auto px-[var(--space-5)] py-[var(--space-7)]">
        {/* ── Cartouche header ───────────────────────────────────────────── */}
        <div className="fe-v4-cartouche mb-8">
          <div className="fe-v4-cartouche-inner">
            <div
              className="text-[10px] font-bold uppercase tracking-[0.30em] text-[var(--color-ink-light)] font-[family-name:var(--font-ui)]"
            >
              Editorial Standards · No. III
            </div>
            <h1
              className="mt-2 text-3xl md:text-5xl font-black leading-[1.05] text-[var(--color-ink)]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
            >
              How The Future Express
              <br />
              Measures Accuracy
            </h1>
            <p
              className="mt-4 max-w-[42rem] mx-auto text-base md:text-lg italic text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)]"
            >
              We publish twenty-four articles a day. Each predicts a market outcome at a stated probability. Markets eventually resolve. We compare. Here is the math.
            </p>
            <div className="mt-4 text-[10px] uppercase tracking-[0.20em] text-[var(--color-ink-faded)] font-[family-name:var(--font-data)]">
              Updated {isoDate} · Resolved predictions: {totalResolved.toLocaleString()} · Active markets tracked: {trackedMarketCount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* ── Section 1: The Score (monolith) ────────────────────────────── */}
        <section className="mb-12">
          <div className="section-title mb-3">§1 · The Score</div>
          <div className="border-2 border-[var(--color-ink)] bg-[var(--color-paper-cream)] p-6 md:p-10 text-center">
            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-light)] font-[family-name:var(--font-ui)]">
              Aggregate Brier Score
            </div>
            <div
              className="mt-3 text-7xl md:text-[8rem] font-black font-[family-name:var(--font-data)] leading-none text-[var(--color-ink)]"
              style={{ fontFeatureSettings: '"tnum", "lnum", "zero"' }}
            >
              {meanBrier == null ? "—.———" : meanBrier.toFixed(3)}
            </div>
            <div className="mt-3 text-sm md:text-base text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)]">
              {meanBrier == null ? (
                <>Score available after the first market resolves. Until then, we publish, log, and wait.</>
              ) : (
                <>
                  across <span className="font-bold font-[family-name:var(--font-data)]">{totalResolved.toLocaleString()}</span> resolved predictions
                </>
              )}
            </div>

            {/* ASCII score band */}
            <pre
              className="mt-6 mx-auto w-fit text-sm md:text-base font-[family-name:var(--font-data)] text-[var(--color-ink)] whitespace-pre"
              style={{ fontFeatureSettings: '"liga" 0, "calt" 0' }}
              aria-hidden
            >
{scoreBand}
            </pre>
            <div
              className="mt-2 mx-auto w-fit grid grid-cols-3 text-[10px] uppercase tracking-[0.18em] font-[family-name:var(--font-ui)] text-[var(--color-ink-light)]"
              style={{ width: "min(41ch, 100%)" }}
            >
              <span className="text-left">Perfect · 0.000</span>
              <span className="text-center">Future Express{meanBrier != null ? ` · ${meanBrier.toFixed(3)}` : ""}</span>
              <span className="text-right">Random · 0.250</span>
            </div>

            <p className="mt-6 max-w-[36rem] mx-auto text-xs md:text-sm text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] italic">
              Brier score is the squared error between published probability and observed outcome. Zero is perfect. 0.25 is the score a coin would get. Tetlock&apos;s superforecasters land between 0.10 and 0.15 on geopolitical questions.
            </p>
          </div>

          <details className="mt-3 border border-[var(--color-rule)] bg-[var(--color-paper-warm)] px-4 py-3 text-sm font-[family-name:var(--font-sub)] text-[var(--color-ink-medium)]">
            <summary className="cursor-pointer font-bold uppercase tracking-[0.14em] text-[10px] font-[family-name:var(--font-ui)] text-[var(--color-ink)]">
              The math
            </summary>
            <pre className="mt-3 text-xs font-[family-name:var(--font-data)] whitespace-pre-wrap text-[var(--color-ink)]">
{`brier_per_market = (forecast_probability − outcome)²
mean_brier       = sum(brier_per_market) / count(resolved)

forecast_probability = articles.probabilityAtPublish / 100
outcome              = markets.resolutionOutcome === "yes" ? 1 : 0`}
            </pre>
          </details>
        </section>

        <hr className="rule-double-ink mb-12" />

        {/* ── Section 2: Calibration plot ─────────────────────────────────── */}
        <section className="mb-12">
          <div className="section-title mb-3">§2 · Calibration</div>
          <h2
            className="text-2xl md:text-3xl font-black text-[var(--color-ink)] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Are 70% predictions resolving 70% of the time?
          </h2>
          <p className="text-sm md:text-base text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] max-w-[42rem] mb-6">
            For each probability bucket, we plot the share of markets that actually resolved YES. A perfectly calibrated forecaster sits on the 45° line. Buckets with fewer than {MIN_BUCKET_N} resolved predictions are rendered as hatched bars and excluded from inference.
          </p>

          <div className="border border-[var(--color-rule-dark)] bg-[var(--color-paper-cream)] p-4 md:p-6 overflow-x-auto">
            <CalibrationPlot buckets={buckets} />
          </div>

          <BucketTable buckets={buckets} />
        </section>

        <hr className="rule-double-ink mb-12" />

        {/* ── Section 3: Track record by category ─────────────────────────── */}
        <section className="mb-12">
          <div className="section-title mb-3">§3 · Track record by desk</div>
          <h2
            className="text-2xl md:text-3xl font-black text-[var(--color-ink)] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Where we&apos;re sharp, where we&apos;re soft.
          </h2>
          <p className="text-sm md:text-base text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] max-w-[42rem] mb-6">
            Brier is a strictly proper scoring rule, so smaller is always better. Sports markets generally resolve cleaner than politics; entertainment is dominated by award shows; crypto is volatile but oracle-clean.
          </p>

          <div className="border border-[var(--color-rule-dark)] overflow-x-auto">
            <table
              className="w-full text-sm font-[family-name:var(--font-sub)]"
              style={{ fontFeatureSettings: '"tnum", "lnum"' }}
            >
              <thead className="bg-[var(--color-paper-warm)] text-[var(--color-ink)]">
                <tr className="text-left">
                  <th className="px-3 py-2 font-bold uppercase tracking-[0.14em] text-[10px] font-[family-name:var(--font-ui)]">
                    Desk
                  </th>
                  <th className="px-3 py-2 font-bold uppercase tracking-[0.14em] text-[10px] font-[family-name:var(--font-ui)] text-right">
                    n
                  </th>
                  <th className="px-3 py-2 font-bold uppercase tracking-[0.14em] text-[10px] font-[family-name:var(--font-ui)] text-right">
                    Brier
                  </th>
                  <th className="px-3 py-2 font-bold uppercase tracking-[0.14em] text-[10px] font-[family-name:var(--font-ui)]">
                    Best call
                  </th>
                  <th className="px-3 py-2 font-bold uppercase tracking-[0.14em] text-[10px] font-[family-name:var(--font-ui)]">
                    Worst call
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((s, i) => (
                  <tr
                    key={s.category}
                    className={i % 2 === 0 ? "bg-[var(--color-paper-cream)]" : "bg-[var(--color-paper)]"}
                  >
                    <td className="px-3 py-2 font-bold text-[var(--color-ink)]">
                      {CATEGORY_LABELS[s.category] ?? s.category}
                    </td>
                    <td className="px-3 py-2 text-right font-[family-name:var(--font-data)] text-[var(--color-ink)]">
                      {s.resolvedCount.toLocaleString()}
                    </td>
                    <td
                      className="px-3 py-2 text-right font-[family-name:var(--font-data)] font-bold"
                      style={{
                        color:
                          s.meanBrier == null
                            ? "var(--color-ink-faded)"
                            : s.meanBrier <= 0.15
                              ? "var(--color-spot-green)"
                              : s.meanBrier <= 0.22
                                ? "var(--color-ink)"
                                : "var(--color-spot-red)",
                      }}
                    >
                      {s.meanBrier == null ? "—" : s.meanBrier.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 max-w-[18rem] truncate text-[var(--color-ink-medium)]">
                      {s.best ? (
                        <Link
                          href={`/article/${s.best.slug}`}
                          className="hover:text-[var(--color-accent-blue)] hover:underline"
                          title={s.best.headline}
                        >
                          <span className="font-[family-name:var(--font-data)] text-[10px] text-[var(--color-spot-green)] mr-2">
                            {s.best.brier.toFixed(3)}
                          </span>
                          {s.best.headline.length > 48
                            ? s.best.headline.slice(0, 47) + "…"
                            : s.best.headline}
                        </Link>
                      ) : (
                        <span className="text-[var(--color-ink-faded)] italic">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-[18rem] truncate text-[var(--color-ink-medium)]">
                      {s.worst ? (
                        <Link
                          href={`/article/${s.worst.slug}`}
                          className="hover:text-[var(--color-accent-blue)] hover:underline"
                          title={s.worst.headline}
                        >
                          <span className="font-[family-name:var(--font-data)] text-[10px] text-[var(--color-spot-red)] mr-2">
                            {s.worst.brier.toFixed(3)}
                          </span>
                          {s.worst.headline.length > 48
                            ? s.worst.headline.slice(0, 47) + "…"
                            : s.worst.headline}
                        </Link>
                      ) : (
                        <span className="text-[var(--color-ink-faded)] italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalResolved === 0 && (
            <p className="mt-3 text-xs text-[var(--color-ink-light)] italic font-[family-name:var(--font-sub)]">
              No resolved predictions yet. The table will populate as Polymarket and Kalshi markets settle.
            </p>
          )}
        </section>

        <hr className="rule-double-ink mb-12" />

        {/* ── Section 4: How we generate ─────────────────────────────────── */}
        <section className="mb-12 max-w-[var(--article-max-width)] mx-auto">
          <div className="section-title mb-3">§4 · How we generate articles</div>
          <h2
            className="text-2xl md:text-3xl font-black text-[var(--color-ink)] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From order book to broadsheet.
          </h2>
          <div className="space-y-5 font-[family-name:var(--font-body)] text-[var(--color-ink-medium)] leading-[1.65]">
            <p>
              <strong className="text-[var(--color-ink)]">Sources.</strong> Every probability we publish is a live read from one of two prediction-market venues:
              <Link href="https://polymarket.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-accent-blue)] mx-1">
                Polymarket
              </Link>
              (USDC, Polygon-settled) and
              <Link href="https://kalshi.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-accent-blue)] mx-1">
                Kalshi
              </Link>
              (CFTC-regulated, USD). When both venues quote the same question, we report the volume-weighted blend and disclose the spread. Order-book data is pulled hourly via their public Gamma and v2 APIs.
            </p>
            <p>
              <strong className="text-[var(--color-ink)]">Model stack.</strong> Article prose is drafted by a multi-provider fallback chain configured by <code className="font-[family-name:var(--font-data)] text-[var(--color-ink)]">LLM_PROVIDER_PRIORITY</code>. In production order: <strong>Anthropic Claude Sonnet 4.6</strong>, <strong>OpenRouter (arcee-ai/trinity-mini)</strong>, <strong>OpenAI gpt-4o-mini</strong>, and the <strong>0G Compute Network (llama-3.3)</strong> as a decentralized fallback. If a provider 5xx&apos;s, the next one picks up the same prompt — no silent degradation, no cached fakes. Image illustrations use <strong>sourceful/riverflow-v2-fast</strong> with a 1920s halftone style transfer. Every article carries the model name in its FILED line.
            </p>
            <p>
              <strong className="text-[var(--color-ink)]">Web research.</strong> Before a draft is written, the editor pulls 5–10 corroborating sources via <strong>Tavily</strong> (semantic search over recent news) and <strong>Brave Search</strong> (general web fallback). Snippets are passed into the prompt as context; URLs are stored on the article record and rendered in the &quot;Sources&quot; rail. We do not clip paywalled bodies, only headline + abstract + URL.
            </p>
            <p>
              <strong className="text-[var(--color-ink)]">The contrarian take.</strong> Every article ships with a <em>Contrarian Take</em> field — a separate generation that argues the case <em>against</em> the market&apos;s implied direction. This is not editorial cosplay; it&apos;s a hedge against the well-documented bias of LLMs to launder consensus into prose. If the market says 78% YES, the contrarian paragraph argues why the 22% NO is the sharper bet. Finance pros tell us this is the field they read first.
            </p>
            <p>
              <strong className="text-[var(--color-ink)]">What we don&apos;t cover.</strong> We exclude markets that incentivize harm: assassination markets, markets on individuals&apos; deaths, doxxing-adjacent markets, and any market whose resolution criterion would reward violence. We also skip markets with an obvious oracle-capture problem (e.g. &quot;will I tweet X by Friday&quot; from a market creator&apos;s own account). The exclusion list is hand-curated and updated when new patterns appear.
            </p>
          </div>
        </section>

        <hr className="rule-double-ink mb-12" />

        {/* ── Section 5: Limitations ─────────────────────────────────────── */}
        <section className="mb-12 max-w-[var(--article-max-width)] mx-auto">
          <div className="section-title mb-3">§5 · Limitations</div>
          <h2
            className="text-2xl md:text-3xl font-black text-[var(--color-ink)] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What we can&apos;t claim.
          </h2>
          <ul className="space-y-4 font-[family-name:var(--font-body)] text-[var(--color-ink-medium)] leading-[1.65] list-none pl-0">
            <li className="border-l-2 border-[var(--color-rule-dark)] pl-4">
              <strong className="text-[var(--color-ink)]">We sample from speculative markets.</strong> Polymarket and Kalshi are thinner than the S&amp;P. Liquidity bias, longshot bias, and ideological clustering are well-documented. A market quote is a price, not a probability — we treat it as the latter only because no better real-time signal exists at our latency budget.
            </li>
            <li className="border-l-2 border-[var(--color-rule-dark)] pl-4">
              <strong className="text-[var(--color-ink)]">Resolution is bound to oracles.</strong> Our outcome variable comes directly from each venue&apos;s resolution. If a Polymarket UMA dispute lands the wrong way, our Brier score for that market lands the wrong way too. We don&apos;t adjudicate resolutions ourselves.
            </li>
            <li className="border-l-2 border-[var(--color-rule-dark)] pl-4">
              <strong className="text-[var(--color-ink)]">Article generation introduces bias.</strong> The probability we cite is sourced; the prose around it is generated. LLMs anchor on the probability and tend to over-justify it. The Contrarian Take is the structural mitigation; we acknowledge it is incomplete.
            </li>
            <li className="border-l-2 border-[var(--color-rule-dark)] pl-4">
              <strong className="text-[var(--color-ink)]">We don&apos;t forecast the world.</strong> We publish what these markets currently believe. Aggregate Brier improves the credibility of the publication; it does not retroactively transform any single article into a prophecy.
            </li>
          </ul>
        </section>

        <hr className="rule-double-ink mb-12" />

        {/* ── Section 6: Cite us ─────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="section-title mb-3">§6 · Cite us</div>
          <h2
            className="text-2xl md:text-3xl font-black text-[var(--color-ink)] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            For journalists, researchers, and the agentic web.
          </h2>
          <p className="text-sm md:text-base text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] max-w-[42rem] mb-6">
            Pre-formatted citations. Click to copy. If you&apos;re building on the data, the JSON feed and OpenAPI spec live at <Link href="/llms.txt" className="underline hover:text-[var(--color-accent-blue)]">/llms.txt</Link>.
          </p>

          <div className="space-y-3">
            <CitationRow label="Plain" body={citationPlain} />
            <CitationRow label="Academic" body={citationAcademic} />
            <CitationRow label="Markdown" body={citationMarkdown} mono />
          </div>
        </section>

        <hr className="rule-double-ink mb-8" />

        {/* ── Section 7: Cross-link footer ───────────────────────────────── */}
        <footer className="text-center pb-8">
          <p className="fe-v4-tagline mb-4">
            —— Printed by a machine that has read more newspapers than you. ——
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs uppercase tracking-[0.16em] font-[family-name:var(--font-ui)] text-[var(--color-ink-light)]">
            <Link href="/transparency" className="underline hover:text-[var(--color-accent-blue)]">
              Transparency · Wallet receipt
            </Link>
            <span aria-hidden>·</span>
            <Link href="/accuracy" className="underline hover:text-[var(--color-accent-blue)]">
              Accuracy · Article-by-article
            </Link>
            <span aria-hidden>·</span>
            <Link href="/#newsletter" className="underline hover:text-[var(--color-accent-blue)]">
              Friday Accuracy Report
            </Link>
            <span aria-hidden>·</span>
            <Link href="/" className="underline hover:text-[var(--color-accent-blue)]">
              Front page
            </Link>
          </div>
          <p className="mt-6 text-[10px] uppercase tracking-[0.20em] text-[var(--color-ink-faded)] font-[family-name:var(--font-data)]">
            Total articles published: {totalArticleCount.toLocaleString()} · Resolved &amp; scored: {totalResolved.toLocaleString()} · Active markets: {trackedMarketCount.toLocaleString()}
          </p>
        </footer>
      </main>
    </div>
  );
}

// ── Calibration plot (pure SVG, server-rendered) ──────────────────────────

function CalibrationPlot({ buckets }: { buckets: Bucket[] }) {
  const W = 640;
  const H = 360;
  const PAD_L = 56;
  const PAD_R = 16;
  const PAD_T = 24;
  const PAD_B = 56;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  // Map x (0..1) and y (0..1) to canvas
  const xOf = (p: number) => PAD_L + p * innerW;
  const yOf = (p: number) => PAD_T + (1 - p) * innerH;

  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Calibration plot. X axis: predicted probability bucket. Y axis: empirical resolution rate. Diagonal line is perfect calibration."
      className="w-full h-auto block"
      style={{ maxWidth: "100%" }}
    >
      <defs>
        <pattern
          id="hatch-insufficient"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke="var(--color-rule-dark)"
            strokeWidth="1.5"
            opacity="0.4"
          />
        </pattern>
      </defs>

      {/* Frame */}
      <rect
        x={PAD_L}
        y={PAD_T}
        width={innerW}
        height={innerH}
        fill="var(--color-paper)"
        stroke="var(--color-rule-dark)"
        strokeWidth="1"
      />

      {/* Gridlines */}
      {ticks.map((t) => (
        <g key={`g-${t}`}>
          <line
            x1={xOf(t)}
            y1={PAD_T}
            x2={xOf(t)}
            y2={PAD_T + innerH}
            stroke="var(--color-rule)"
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.6"
          />
          <line
            x1={PAD_L}
            y1={yOf(t)}
            x2={PAD_L + innerW}
            y2={yOf(t)}
            stroke="var(--color-rule)"
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.6"
          />
        </g>
      ))}

      {/* Diagonal: perfect calibration */}
      <line
        x1={xOf(0)}
        y1={yOf(0)}
        x2={xOf(1)}
        y2={yOf(1)}
        stroke="var(--color-ink)"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.8"
      />

      {/* Bucket bars: column from x=lo/100 to x=hi/100, height = empirical */}
      {buckets.map((b, i) => {
        const x = xOf(b.lo / 100);
        const w = xOf(b.hi / 100) - x;
        const insufficient = b.count < MIN_BUCKET_N;
        if (b.count === 0) return null;
        const top = yOf(b.empirical);
        const bottom = yOf(0);
        return (
          <g key={`bar-${i}`}>
            <rect
              x={x + 1}
              y={top}
              width={Math.max(2, w - 2)}
              height={Math.max(0, bottom - top)}
              fill={
                insufficient
                  ? "url(#hatch-insufficient)"
                  : "var(--color-paper-warm)"
              }
              stroke="var(--color-rule-dark)"
              strokeWidth="1"
              opacity={insufficient ? 0.7 : 1}
            />
          </g>
        );
      })}

      {/* Bucket dots: actual mean forecast vs empirical */}
      {buckets.map((b, i) => {
        if (b.count === 0) return null;
        const insufficient = b.count < MIN_BUCKET_N;
        const cx = xOf(b.meanForecast);
        const cy = yOf(b.empirical);
        return (
          <g key={`dot-${i}`}>
            <circle
              cx={cx}
              cy={cy}
              r={insufficient ? 3 : 5}
              fill={insufficient ? "var(--color-paper-cream)" : "var(--color-accent-red)"}
              stroke="var(--color-ink)"
              strokeWidth="1.5"
              opacity={insufficient ? 0.5 : 1}
            />
          </g>
        );
      })}

      {/* Axis ticks/labels */}
      {ticks.map((t) => (
        <g key={`xt-${t}`}>
          <text
            x={xOf(t)}
            y={PAD_T + innerH + 18}
            textAnchor="middle"
            fontSize="11"
            fontFamily="var(--font-data)"
            fill="var(--color-ink-light)"
          >
            {Math.round(t * 100)}%
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={`yt-${t}`}>
          <text
            x={PAD_L - 8}
            y={yOf(t) + 4}
            textAnchor="end"
            fontSize="11"
            fontFamily="var(--font-data)"
            fill="var(--color-ink-light)"
          >
            {Math.round(t * 100)}%
          </text>
        </g>
      ))}

      {/* Axis titles */}
      <text
        x={PAD_L + innerW / 2}
        y={H - 12}
        textAnchor="middle"
        fontSize="11"
        fontFamily="var(--font-ui)"
        fontWeight="700"
        letterSpacing="0.16em"
        fill="var(--color-ink)"
      >
        PREDICTED PROBABILITY (PUBLISHED)
      </text>
      <text
        x={16}
        y={PAD_T + innerH / 2}
        textAnchor="middle"
        fontSize="11"
        fontFamily="var(--font-ui)"
        fontWeight="700"
        letterSpacing="0.16em"
        fill="var(--color-ink)"
        transform={`rotate(-90, 16, ${PAD_T + innerH / 2})`}
      >
        EMPIRICAL FREQUENCY
      </text>

      {/* Legend */}
      <g transform={`translate(${PAD_L + 12}, ${PAD_T + 12})`}>
        <rect
          x="0"
          y="0"
          width="220"
          height="58"
          fill="var(--color-paper-cream)"
          stroke="var(--color-rule)"
          strokeWidth="1"
        />
        <line x1="8" y1="16" x2="32" y2="16" stroke="var(--color-ink)" strokeWidth="1.5" strokeDasharray="6 4" />
        <text x="38" y="20" fontSize="10" fontFamily="var(--font-ui)" fill="var(--color-ink)">
          Perfect calibration (45°)
        </text>
        <circle cx="20" cy="34" r="4" fill="var(--color-accent-red)" stroke="var(--color-ink)" strokeWidth="1.5" />
        <text x="38" y="38" fontSize="10" fontFamily="var(--font-ui)" fill="var(--color-ink)">
          Bucket mean (n ≥ {MIN_BUCKET_N})
        </text>
        <rect x="8" y="46" width="24" height="8" fill="url(#hatch-insufficient)" stroke="var(--color-rule-dark)" strokeWidth="1" />
        <text x="38" y="54" fontSize="10" fontFamily="var(--font-ui)" fill="var(--color-ink)">
          Insufficient data (n &lt; {MIN_BUCKET_N})
        </text>
      </g>
    </svg>
  );
}

function BucketTable({ buckets }: { buckets: Bucket[] }) {
  return (
    <div className="mt-4 border border-[var(--color-rule)] overflow-x-auto">
      <table
        className="w-full text-xs font-[family-name:var(--font-sub)]"
        style={{ fontFeatureSettings: '"tnum", "lnum"' }}
      >
        <thead className="bg-[var(--color-paper-warm)]">
          <tr className="text-left">
            <th className="px-3 py-2 font-bold uppercase tracking-[0.14em] text-[10px] font-[family-name:var(--font-ui)]">
              Bucket
            </th>
            <th className="px-3 py-2 font-bold uppercase tracking-[0.14em] text-[10px] font-[family-name:var(--font-ui)] text-right">
              n
            </th>
            <th className="px-3 py-2 font-bold uppercase tracking-[0.14em] text-[10px] font-[family-name:var(--font-ui)] text-right">
              Mean forecast
            </th>
            <th className="px-3 py-2 font-bold uppercase tracking-[0.14em] text-[10px] font-[family-name:var(--font-ui)] text-right">
              Empirical
            </th>
            <th className="px-3 py-2 font-bold uppercase tracking-[0.14em] text-[10px] font-[family-name:var(--font-ui)]">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b, i) => {
            const insufficient = b.count < MIN_BUCKET_N;
            return (
              <tr
                key={`row-${i}`}
                className={i % 2 === 0 ? "bg-[var(--color-paper-cream)]" : "bg-[var(--color-paper)]"}
              >
                <td className="px-3 py-1.5 font-[family-name:var(--font-data)] text-[var(--color-ink)]">
                  {b.lo}–{b.hi}%
                </td>
                <td className="px-3 py-1.5 text-right font-[family-name:var(--font-data)] text-[var(--color-ink)]">
                  {b.count}
                </td>
                <td className="px-3 py-1.5 text-right font-[family-name:var(--font-data)] text-[var(--color-ink-medium)]">
                  {b.count === 0 ? "—" : `${(b.meanForecast * 100).toFixed(1)}%`}
                </td>
                <td className="px-3 py-1.5 text-right font-[family-name:var(--font-data)] text-[var(--color-ink-medium)]">
                  {b.count === 0 ? "—" : `${(b.empirical * 100).toFixed(1)}%`}
                </td>
                <td className="px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] font-[family-name:var(--font-ui)]">
                  {b.count === 0 ? (
                    <span className="text-[var(--color-ink-faded)]">No data</span>
                  ) : insufficient ? (
                    <span className="text-[var(--color-warning)]">Insufficient</span>
                  ) : (
                    <span className="text-[var(--color-spot-green)]">Significant</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CitationRow({
  label,
  body,
  mono = false,
}: {
  label: string;
  body: string;
  mono?: boolean;
}) {
  return (
    <div className="border border-[var(--color-rule-dark)] bg-[var(--color-paper-cream)] p-3 md:p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.20em] text-[var(--color-ink-light)] font-[family-name:var(--font-ui)]">
          {label}
        </span>
        <CitationCopyButton text={body} label="Copy citation" />
      </div>
      <div
        className={`text-sm break-words ${
          mono
            ? "font-[family-name:var(--font-data)] text-[var(--color-ink)]"
            : "font-[family-name:var(--font-sub)] text-[var(--color-ink-medium)]"
        }`}
      >
        {body}
      </div>
    </div>
  );
}

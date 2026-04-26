import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  platformAccuracy,
  accuracyReports,
  marketAccuracy,
  articles,
  markets,
} from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { Masthead } from "@/components/Masthead";
import { SectionNav } from "@/components/SectionNav";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: "Our Track Record | The Future Express",
    description:
      "How accurate are prediction market-based news articles? See our prediction accuracy score, best calls, and worst misses.",
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

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "var(--color-spot-green)";
  if (grade.startsWith("B")) return "var(--color-ink)";
  if (grade.startsWith("C")) return "var(--color-ink-light)";
  return "var(--color-spot-red)";
}

export default async function AccuracyPage() {
  // Fetch latest all-time stats
  let stats = null;
  let latestReport = null;
  let topHits: Array<{
    headline: string;
    slug: string;
    probabilityAtPublish: string | null;
    brierScore: string | null;
    resolutionOutcome: string | null;
    directionCorrect: number | null;
  }> = [];
  let topMisses: typeof topHits = [];
  let reports: Array<{
    id: string;
    headline: string;
    grade: string;
    publishedAt: Date;
  }> = [];

  try {
    const [pa] = await db
      .select()
      .from(platformAccuracy)
      .where(eq(platformAccuracy.period, "all_time"))
      .orderBy(desc(platformAccuracy.computedAt))
      .limit(1);
    stats = pa ?? null;

    const [report] = await db
      .select()
      .from(accuracyReports)
      .orderBy(desc(accuracyReports.publishedAt))
      .limit(1);
    latestReport = report ?? null;

    // Best predictions (lowest Brier score = most accurate)
    topHits = await db
      .select({
        headline: articles.headline,
        slug: articles.slug,
        probabilityAtPublish: marketAccuracy.probabilityAtPublish,
        brierScore: marketAccuracy.brierScore,
        resolutionOutcome: marketAccuracy.resolutionOutcome,
        directionCorrect: marketAccuracy.directionCorrect,
      })
      .from(marketAccuracy)
      .innerJoin(articles, eq(marketAccuracy.articleId, articles.id))
      .where(and(eq(marketAccuracy.status, "resolved"), eq(marketAccuracy.directionCorrect, 1)))
      .orderBy(marketAccuracy.brierScore)
      .limit(10);

    // Worst predictions (highest Brier score = least accurate)
    topMisses = await db
      .select({
        headline: articles.headline,
        slug: articles.slug,
        probabilityAtPublish: marketAccuracy.probabilityAtPublish,
        brierScore: marketAccuracy.brierScore,
        resolutionOutcome: marketAccuracy.resolutionOutcome,
        directionCorrect: marketAccuracy.directionCorrect,
      })
      .from(marketAccuracy)
      .innerJoin(articles, eq(marketAccuracy.articleId, articles.id))
      .where(and(eq(marketAccuracy.status, "resolved"), eq(marketAccuracy.directionCorrect, 0)))
      .orderBy(desc(marketAccuracy.brierScore))
      .limit(10);

    // Recent reports
    reports = await db
      .select({
        id: accuracyReports.id,
        headline: accuracyReports.headline,
        grade: accuracyReports.grade,
        publishedAt: accuracyReports.publishedAt,
      })
      .from(accuracyReports)
      .orderBy(desc(accuracyReports.publishedAt))
      .limit(10);
  } catch {
    // Tables may not exist yet
  }

  const score = stats?.confidenceScore ?? 0;
  const resolvedCount = stats?.resolvedArticles ?? 0;
  const correctCount = stats?.correctDirectionCount ?? 0;
  const correctPct = resolvedCount > 0 ? Math.round((correctCount / resolvedCount) * 100) : 0;
  const catBreakdown = (stats?.categoryBreakdown ?? {}) as Record<
    string,
    { total: number; correct: number; accuracyPct: number; avgBrier: number | null }
  >;

  return (
    <div className="paper-texture min-h-screen">
      <Masthead compact />
      <SectionNav />

      <main className="max-w-[var(--max-width)] mx-auto px-[var(--space-5)] py-[var(--space-6)]">
        <h1
          className="text-3xl md:text-4xl font-black text-[var(--color-ink)] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The Record
        </h1>
        <p className="text-lg italic text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] mb-6">
          How well do prediction markets forecast the future? We track every article.
        </p>

        <div className="divider-double mb-8" />

        {/* Hero Stats */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Confidence Score */}
          <div className="md:col-span-1 text-center p-6 border-2 border-[var(--color-rule-dark)] bg-[var(--color-paper-cream)]">
            <div
              className="text-6xl font-black font-[family-name:var(--font-data)] tabular-nums leading-none"
              style={{
                color: score >= 75 ? "var(--color-spot-green)" : score >= 50 ? "var(--color-ink)" : "var(--color-spot-red)",
              }}
            >
              {score}
            </div>
            <div className="text-xs uppercase tracking-wider text-[var(--color-ink-light)] font-[family-name:var(--font-ui)] mt-2">
              Confidence Score
            </div>
            <div className="mt-3 h-2 bg-[var(--color-rule)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${score}%`,
                  backgroundColor: score >= 75 ? "var(--color-spot-green)" : score >= 50 ? "var(--color-ink-light)" : "var(--color-spot-red)",
                }}
              />
            </div>
          </div>

          {/* Direction Accuracy */}
          <div className="text-center p-6 border border-[var(--color-rule)] bg-[var(--color-paper-warm)]">
            <div className="text-4xl font-bold font-[family-name:var(--font-data)] tabular-nums text-[var(--color-ink)]">
              {correctPct}%
            </div>
            <div className="text-xs uppercase tracking-wider text-[var(--color-ink-light)] font-[family-name:var(--font-ui)] mt-1">
              Direction Correct
            </div>
            <div className="text-sm text-[var(--color-ink-medium)] mt-1">
              {correctCount} of {resolvedCount}
            </div>
          </div>

          {/* Brier Score */}
          <div className="text-center p-6 border border-[var(--color-rule)] bg-[var(--color-paper-warm)]">
            <div className="text-4xl font-bold font-[family-name:var(--font-data)] tabular-nums text-[var(--color-ink)]">
              {stats?.avgBrierScore ? Number(stats.avgBrierScore).toFixed(3) : "---"}
            </div>
            <div className="text-xs uppercase tracking-wider text-[var(--color-ink-light)] font-[family-name:var(--font-ui)] mt-1">
              Avg Brier Score
            </div>
            <div className="text-sm text-[var(--color-ink-medium)] mt-1">
              Lower is better
            </div>
          </div>

          {/* Latest Grade */}
          <div className="text-center p-6 border border-[var(--color-rule)] bg-[var(--color-paper-warm)]">
            <div
              className="text-5xl font-black font-[family-name:var(--font-display)]"
              style={{ color: latestReport ? gradeColor(latestReport.grade) : "var(--color-ink-light)" }}
            >
              {latestReport?.grade ?? "---"}
            </div>
            <div className="text-xs uppercase tracking-wider text-[var(--color-ink-light)] font-[family-name:var(--font-ui)] mt-1">
              Latest Grade
            </div>
          </div>
        </section>

        {/* Category Breakdown */}
        {Object.keys(catBreakdown).length > 0 && (
          <section className="mb-8">
            <h2 className="section-title mb-4">Accuracy by Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {Object.entries(catBreakdown)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([cat, data]) => (
                  <div key={cat} className="p-3 border border-[var(--color-rule)] bg-[var(--color-paper-cream)] text-center">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-light)] font-[family-name:var(--font-ui)]">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </div>
                    <div
                      className="text-2xl font-bold font-[family-name:var(--font-data)] mt-1"
                      style={{
                        color: data.accuracyPct >= 70 ? "var(--color-spot-green)" : data.accuracyPct >= 50 ? "var(--color-ink)" : "var(--color-spot-red)",
                      }}
                    >
                      {data.accuracyPct}%
                    </div>
                    <div className="text-[10px] text-[var(--color-ink-faded)] mt-1">
                      {data.correct}/{data.total}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        <div className="divider-double mb-8" />

        {/* Best and Worst Calls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {topHits.length > 0 && (
            <section>
              <h2 className="section-title mb-4" style={{ color: "var(--color-spot-green)" }}>
                Best Calls
              </h2>
              <div className="space-y-2">
                {topHits.map((hit, i) => (
                  <Link
                    key={i}
                    href={`/article/${hit.slug}`}
                    className="block p-3 border border-[var(--color-rule)] bg-[var(--color-paper-warm)] hover:bg-[var(--color-paper-cream)] transition-colors group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <span className="font-semibold text-sm text-[var(--color-ink)] group-hover:text-[var(--color-accent-blue)] font-[family-name:var(--font-sub)] leading-snug">
                        {hit.headline}
                      </span>
                      <span className="text-xs font-bold text-[var(--color-spot-green)] font-[family-name:var(--font-data)] shrink-0">
                        {hit.brierScore ? Number(hit.brierScore).toFixed(3) : "---"}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--color-ink-light)] mt-1 font-[family-name:var(--font-ui)]">
                      Published at {hit.probabilityAtPublish}% | Resolved {hit.resolutionOutcome?.toUpperCase()}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {topMisses.length > 0 && (
            <section>
              <h2 className="section-title mb-4" style={{ color: "var(--color-spot-red)" }}>
                Worst Calls
              </h2>
              <div className="space-y-2">
                {topMisses.map((miss, i) => (
                  <Link
                    key={i}
                    href={`/article/${miss.slug}`}
                    className="block p-3 border border-[var(--color-rule)] bg-[var(--color-paper-warm)] hover:bg-[var(--color-paper-cream)] transition-colors group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <span className="font-semibold text-sm text-[var(--color-ink)] group-hover:text-[var(--color-accent-blue)] font-[family-name:var(--font-sub)] leading-snug">
                        {miss.headline}
                      </span>
                      <span className="text-xs font-bold text-[var(--color-spot-red)] font-[family-name:var(--font-data)] shrink-0">
                        {miss.brierScore ? Number(miss.brierScore).toFixed(3) : "---"}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--color-ink-light)] mt-1 font-[family-name:var(--font-ui)]">
                      Published at {miss.probabilityAtPublish}% | Resolved {miss.resolutionOutcome?.toUpperCase()}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Weekly Reports */}
        {reports.length > 0 && (
          <section className="mb-8">
            <div className="divider-double mb-8" />
            <h2 className="section-title mb-4">Weekly Report Cards</h2>
            <div className="space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 border border-[var(--color-rule)] bg-[var(--color-paper-warm)]"
                >
                  <div>
                    <span className="font-semibold text-sm text-[var(--color-ink)] font-[family-name:var(--font-sub)]">
                      {report.headline}
                    </span>
                    <span className="text-xs text-[var(--color-ink-light)] ml-3">
                      {new Date(report.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <span
                    className="text-xl font-black font-[family-name:var(--font-display)]"
                    style={{ color: gradeColor(report.grade) }}
                  >
                    {report.grade}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {resolvedCount === 0 && (
          <div className="py-12 text-center">
            <p className="text-lg italic text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)]">
              No resolved predictions yet. As prediction markets resolve, our track record will appear here.
            </p>
            <p className="text-sm text-[var(--color-ink-light)] mt-3 font-[family-name:var(--font-ui)]">
              Every article we publish is tracked against the market outcome.
            </p>
          </div>
        )}

        {/* Methodology */}
        <section className="mt-8 p-4 border border-[var(--color-rule)] bg-[var(--color-paper-cream)]">
          <h3 className="section-title text-xs mb-2">Methodology</h3>
          <p className="text-xs text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] leading-relaxed">
            Every article published by The Future Express is tied to a prediction market. When the market resolves,
            we compute a Brier score comparing our published probability to the actual outcome. A Brier score of 0
            is perfect accuracy; 1 is perfectly wrong. The Confidence Score (0-100) is derived from the average Brier
            score across all resolved predictions. Direction accuracy measures whether we correctly indicated the
            market&apos;s eventual direction at the time of publication.
          </p>
        </section>

        <footer className="mt-12 py-6 text-center text-sm text-[var(--color-ink-light)]">
          <Link href="/" className="hover:text-[var(--color-accent-blue)]">
            &larr; Back to Front Page
          </Link>
        </footer>
      </main>
    </div>
  );
}

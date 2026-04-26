import Link from "next/link";
import { db } from "@/lib/db";
import { platformAccuracy, accuracyReports } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

const CATEGORY_LABELS: Record<string, string> = {
  politics: "Politics",
  economy: "Economy",
  crypto: "Crypto",
  sports: "Sports",
  science: "Science",
  entertainment: "Ent.",
  world: "World",
};

export async function PlatformConfidence() {
  let stats;
  let latestReport;

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
  } catch {
    // Tables may not exist yet
    return null;
  }

  if (!stats || !stats.resolvedArticles || stats.resolvedArticles === 0) {
    return null;
  }

  const score = stats.confidenceScore ?? 0;
  const correctPct =
    stats.resolvedArticles > 0
      ? Math.round((stats.correctDirectionCount / stats.resolvedArticles) * 100)
      : 0;
  const catBreakdown = (stats.categoryBreakdown ?? {}) as Record<
    string,
    { total: number; correct: number; accuracyPct: number }
  >;

  return (
    <div className="border-2 border-[var(--color-rule-dark)] bg-[var(--color-paper-cream)] p-4">
      <h4 className="section-title mb-3">Our Track Record</h4>

      {/* Confidence Score Gauge */}
      <div className="text-center mb-3">
        <div
          className="text-4xl font-black font-[family-name:var(--font-data)] tabular-nums leading-none"
          style={{
            color:
              score >= 75
                ? "var(--color-spot-green)"
                : score >= 50
                  ? "var(--color-ink)"
                  : "var(--color-spot-red)",
          }}
        >
          {score}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-light)] font-[family-name:var(--font-ui)] mt-1">
          Confidence Score
        </div>
        {/* Visual gauge bar */}
        <div className="mt-2 h-1.5 bg-[var(--color-rule)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              backgroundColor:
                score >= 75
                  ? "var(--color-spot-green)"
                  : score >= 50
                    ? "var(--color-ink-light)"
                    : "var(--color-spot-red)",
            }}
          />
        </div>
      </div>

      <div className="divider-thin my-3" />

      <div className="text-xs text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] space-y-1">
        <div className="flex justify-between">
          <span>Direction Correct</span>
          <span className="font-bold font-[family-name:var(--font-data)]">{correctPct}%</span>
        </div>
        <div className="flex justify-between">
          <span>Resolved Predictions</span>
          <span className="font-bold font-[family-name:var(--font-data)]">{stats.resolvedArticles}</span>
        </div>
        {stats.avgBrierScore && (
          <div className="flex justify-between">
            <span>Avg Brier Score</span>
            <span className="font-bold font-[family-name:var(--font-data)]">
              {Number(stats.avgBrierScore).toFixed(3)}
            </span>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {Object.keys(catBreakdown).length > 0 && (
        <>
          <div className="divider-thin my-3" />
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-ink-light)] font-[family-name:var(--font-ui)] mb-2">
            By Category
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {Object.entries(catBreakdown)
              .sort((a, b) => b[1].total - a[1].total)
              .slice(0, 6)
              .map(([cat, data]) => (
                <div key={cat} className="flex justify-between">
                  <span className="text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)]">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                  <span
                    className="font-bold font-[family-name:var(--font-data)]"
                    style={{
                      color:
                        data.accuracyPct >= 70
                          ? "var(--color-spot-green)"
                          : data.accuracyPct >= 50
                            ? "var(--color-ink)"
                            : "var(--color-spot-red)",
                    }}
                  >
                    {data.accuracyPct}%
                  </span>
                </div>
              ))}
          </div>
        </>
      )}

      {/* Latest report grade */}
      {latestReport && (
        <>
          <div className="divider-thin my-3" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-light)] font-[family-name:var(--font-ui)]">
              Latest Grade
            </span>
            <span className="text-lg font-black font-[family-name:var(--font-display)]">
              {latestReport.grade}
            </span>
          </div>
        </>
      )}

      <Link
        href="/accuracy"
        className="mt-3 block text-center text-xs font-bold uppercase tracking-wide text-[var(--color-accent-blue)] hover:underline font-[family-name:var(--font-ui)]"
      >
        Full Track Record
      </Link>
    </div>
  );
}

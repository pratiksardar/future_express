import { Metadata } from "next";
import { db } from "@/lib/db";
import { dailyChallenges, markets } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { DailyChallenge } from "@/components/DailyChallenge";
import { Masthead } from "@/components/Masthead";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily Prediction Challenge — The Future Express",
  description:
    "Test your forecasting skills. Predict where 5 prediction markets will resolve — one challenge per day.",
};

type ChallengeMarket = {
  id: string;
  title: string;
  category: string;
  currentProbability: number;
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getTodaysChallenge(): Promise<{
  date: string;
  markets: ChallengeMarket[];
} | null> {
  try {
    const date = todayDate();

    // Check for existing challenge
    let [challenge] = await db
      .select()
      .from(dailyChallenges)
      .where(eq(dailyChallenges.date, date))
      .limit(1);

    // Auto-create if missing
    if (!challenge) {
      const activeMarkets = await db
        .select({ id: markets.id })
        .from(markets)
        .where(
          and(
            eq(markets.status, "active"),
            sql`${markets.currentProbability} IS NOT NULL`
          )
        )
        .limit(50);

      if (activeMarkets.length < 5) return null;

      const shuffled = [...activeMarkets];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const picked = shuffled.slice(0, 5).map((m) => m.id);

      const [created] = await db
        .insert(dailyChallenges)
        .values({ date, marketIds: picked })
        .returning();

      challenge = created;
    }

    // Fetch market data
    const marketRows = await db
      .select({
        id: markets.id,
        title: markets.title,
        category: markets.category,
        currentProbability: markets.currentProbability,
      })
      .from(markets)
      .where(sql`${markets.id} = ANY(${challenge.marketIds}::uuid[])`);

    const byId = new Map(marketRows.map((m) => [m.id, m]));
    const ordered = challenge.marketIds
      .map((id) => byId.get(id))
      .filter(Boolean) as typeof marketRows;

    return {
      date: challenge.date,
      markets: ordered.map((m) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        currentProbability: m.currentProbability
          ? Math.round(Number(m.currentProbability))
          : 50,
      })),
    };
  } catch (err) {
    console.error("[challenge page]", err);
    return null;
  }
}

export default async function ChallengePage() {
  const challenge = await getTodaysChallenge();

  return (
    <div className="paper-texture min-h-screen">
      <Masthead />

      <main className="max-w-[var(--max-width)] mx-auto px-[var(--space-4)]">
        {challenge ? (
          <DailyChallenge initial={challenge} />
        ) : (
          <div className="max-w-xl mx-auto px-4 py-16 text-center">
            <h1
              className="text-3xl font-black text-[var(--color-ink)] mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Challenge Unavailable
            </h1>
            <p className="text-[var(--color-ink-light)] italic font-[family-name:var(--font-sub)] mb-6">
              Not enough active markets to build today&apos;s challenge. Check
              back later.
            </p>
            <Link
              href="/"
              className="text-sm underline text-[var(--color-accent-blue)] hover:text-[var(--color-ink)] transition-colors"
            >
              Return to the Front Page
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyChallenges, userPredictions, markets } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { scorePrediction } from "@/lib/challenge/scoring";
import { recordPlayAndUpdateStreak, type StreakState } from "@/lib/challenge/streak";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function getOrCreateChallenge(date: string) {
  // Try to find existing challenge for today
  const [existing] = await db
    .select()
    .from(dailyChallenges)
    .where(eq(dailyChallenges.date, date))
    .limit(1);

  if (existing) return existing;

  // Auto-create: pick 5 random active markets that have a currentProbability
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

  if (activeMarkets.length < 5) {
    return null;
  }

  // Fisher-Yates shuffle and take 5
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

  return created;
}

export async function GET() {
  try {
    const date = todayDate();
    const challenge = await getOrCreateChallenge(date);

    if (!challenge) {
      return NextResponse.json(
        { error: "Not enough active markets to create a challenge" },
        { status: 503 }
      );
    }

    // Fetch market data — title + current probability only (no article analysis)
    const marketRows = await db
      .select({
        id: markets.id,
        title: markets.title,
        category: markets.category,
        currentProbability: markets.currentProbability,
      })
      .from(markets)
      .where(
        sql`${markets.id} = ANY(${challenge.marketIds}::uuid[])`
      );

    // Preserve the order from challenge.marketIds
    const byId = new Map(marketRows.map((m) => [m.id, m]));
    const ordered = challenge.marketIds
      .map((id) => byId.get(id))
      .filter(Boolean);

    return NextResponse.json(
      {
        date: challenge.date,
        markets: ordered.map((m) => ({
          id: m!.id,
          title: m!.title,
          category: m!.category,
          currentProbability: m!.currentProbability
            ? Math.round(Number(m!.currentProbability))
            : 50,
        })),
      },
      {
        headers: {
          // Cache for 1 hour — same challenge all day
          "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[challenge GET]", err);
    return NextResponse.json({ error: "Failed to load challenge" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, marketId, predictedProbability } = body as {
      sessionId?: string;
      marketId?: string;
      predictedProbability?: number;
    };

    if (
      !sessionId ||
      !marketId ||
      predictedProbability === undefined ||
      predictedProbability < 0 ||
      predictedProbability > 100
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const date = todayDate();

    // Get the market's current probability (serves as "actual" for scoring now)
    const [market] = await db
      .select({ currentProbability: markets.currentProbability })
      .from(markets)
      .where(eq(markets.id, marketId))
      .limit(1);

    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const actual = market.currentProbability
      ? Math.round(Number(market.currentProbability))
      : 50;

    const score = scorePrediction(predictedProbability, actual);

    // Upsert the prediction (ignore conflict on duplicate)
    const [saved] = await db
      .insert(userPredictions)
      .values({
        sessionId,
        challengeDate: date,
        marketId,
        predictedProbability,
        actualProbability: actual,
        score,
      })
      .onConflictDoNothing()
      .returning();

    // Update the streak — idempotent for same-day re-plays. Failures here
    // must NOT break the prediction submit (the streak is a UX concern,
    // the score is the canonical action).
    let streak: StreakState | null = null;
    try {
      streak = await recordPlayAndUpdateStreak(sessionId, date);
    } catch (e) {
      console.error("[challenge POST] streak update failed", e);
    }

    // If conflict (already submitted), return existing score
    if (!saved) {
      const [existing] = await db
        .select()
        .from(userPredictions)
        .where(
          and(
            eq(userPredictions.sessionId, sessionId),
            eq(userPredictions.challengeDate, date),
            eq(userPredictions.marketId, marketId)
          )
        )
        .limit(1);

      return NextResponse.json({
        score: existing?.score ?? score,
        actual: existing?.actualProbability ?? actual,
        alreadySubmitted: true,
        streak,
      });
    }

    return NextResponse.json({ score, actual, streak });
  } catch (err) {
    console.error("[challenge POST]", err);
    return NextResponse.json({ error: "Failed to save prediction" }, { status: 500 });
  }
}

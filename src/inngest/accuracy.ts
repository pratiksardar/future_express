import { inngest } from "./client";
import {
  scoreAllPendingArticles,
  computePlatformAccuracyStats,
  generateAccuracyReport,
} from "@/lib/articles/accuracy";
import { db } from "@/lib/db";
import { platformAccuracy } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/** Score resolved markets every 30 minutes. */
export const scoreResolvedMarkets = inngest.createFunction(
  { id: "score-resolved-markets", name: "Score prediction accuracy for resolved markets" },
  { cron: "*/30 * * * *" },
  async () => {
    const result = await scoreAllPendingArticles();
    return {
      scored: result.scored,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 5),
    };
  }
);

/** Compute daily/weekly/monthly/all-time accuracy stats at midnight UTC. */
export const computeDailyAccuracy = inngest.createFunction(
  { id: "compute-daily-accuracy", name: "Compute platform accuracy stats" },
  { cron: "0 0 * * *" },
  async () => {
    const now = new Date();
    const results: string[] = [];

    // Always compute all-time
    const allTimeId = await computePlatformAccuracyStats("all_time");
    if (allTimeId) results.push(`all_time: ${allTimeId}`);

    // Daily: yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const dailyId = await computePlatformAccuracyStats("daily", yesterday);
    if (dailyId) results.push(`daily: ${dailyId}`);

    // Weekly: on Mondays
    if (now.getUTCDay() === 1) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      const weeklyId = await computePlatformAccuracyStats("weekly", weekStart);
      if (weeklyId) results.push(`weekly: ${weeklyId}`);
    }

    // Monthly: on the 1st
    if (now.getUTCDate() === 1) {
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - 1);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthlyId = await computePlatformAccuracyStats("monthly", monthStart);
      if (monthlyId) results.push(`monthly: ${monthlyId}`);
    }

    return { computed: results };
  }
);

/** Generate an AI accuracy report every Monday at 9 AM UTC. */
export const generateWeeklyReport = inngest.createFunction(
  { id: "generate-weekly-accuracy-report", name: "Generate weekly AI accuracy report" },
  { cron: "0 9 * * 1" },
  async () => {
    // Find the latest weekly platform accuracy record
    const [latest] = await db
      .select({ id: platformAccuracy.id })
      .from(platformAccuracy)
      .where(eq(platformAccuracy.period, "weekly"))
      .orderBy(desc(platformAccuracy.computedAt))
      .limit(1);

    if (!latest) return { error: "No weekly accuracy data found" };

    const result = await generateAccuracyReport(latest.id);
    return result;
  }
);

export const accuracyFunctions = [
  scoreResolvedMarkets,
  computeDailyAccuracy,
  generateWeeklyReport,
];

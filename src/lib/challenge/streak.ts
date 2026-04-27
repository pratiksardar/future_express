/**
 * Daily Prediction Challenge — server-side streak persistence.
 *
 * This module imports `@/lib/db` (postgres-js) and is therefore server-only.
 * Pure helpers and types live in `streak-shared.ts` and can be imported
 * from React client components. We re-export the shared symbols here for
 * server callers' convenience.
 *
 * Identity is the localStorage `tfe_session_id` (no auth in v1). The streak
 * advances when the session submits at least one prediction on a new UTC
 * day.
 *
 * Rules:
 *  - same-day re-play is idempotent
 *  - exactly-+1-day gap → increment current streak
 *  - +2-day gap (one missed day) AND grace not used in last 7 days →
 *    forgive once, increment, stamp grace_used_at = today
 *  - any larger gap → reset current to 1
 *
 * `longest_streak` is updated whenever current >= longest.
 */

import "server-only";
import { db } from "@/lib/db";
import { dailyChallengeStreaks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  STREAK_GRACE_COOLDOWN_DAYS,
  dayDiff,
  projectStreak,
  todayIso,
  type StreakState,
} from "./streak-shared";

export type { StreakState, StreakDay } from "./streak-shared";
export {
  todayIso,
  toIsoDate,
  dayDiff,
  addDays,
  parseIsoDate,
  projectStreak,
  buildSevenDayCalendar,
  STREAK_GRACE_COOLDOWN_DAYS,
} from "./streak-shared";

/** Read the current streak state for a session. */
export async function getStreakForSession(
  sessionId: string
): Promise<StreakState> {
  const [row] = await db
    .select({
      currentStreak: dailyChallengeStreaks.currentStreak,
      longestStreak: dailyChallengeStreaks.longestStreak,
      lastPlayedDate: dailyChallengeStreaks.lastPlayedDate,
      graceUsedAt: dailyChallengeStreaks.graceUsedAt,
    })
    .from(dailyChallengeStreaks)
    .where(eq(dailyChallengeStreaks.sessionId, sessionId))
    .limit(1);

  return projectStreak(row ?? null, todayIso());
}

/**
 * Record a play for `date` and return the new streak state.
 * Idempotent for same-day repeated calls.
 */
export async function recordPlayAndUpdateStreak(
  sessionId: string,
  date: string
): Promise<StreakState> {
  const [existing] = await db
    .select()
    .from(dailyChallengeStreaks)
    .where(eq(dailyChallengeStreaks.sessionId, sessionId))
    .limit(1);

  if (!existing) {
    // First-ever play.
    await db.insert(dailyChallengeStreaks).values({
      sessionId,
      currentStreak: 1,
      longestStreak: 1,
      lastPlayedDate: date,
      graceUsedAt: null,
    });
    return projectStreak(
      {
        currentStreak: 1,
        longestStreak: 1,
        lastPlayedDate: date,
        graceUsedAt: null,
      },
      date
    );
  }

  // Idempotent: same-day re-play.
  if (existing.lastPlayedDate === date) {
    return projectStreak(existing, date);
  }

  // Compute gap from prior play.
  let nextCurrent = existing.currentStreak;
  let nextGraceUsedAt = existing.graceUsedAt;
  const prior = existing.lastPlayedDate;

  if (prior === null) {
    nextCurrent = 1;
  } else {
    const gap = dayDiff(prior, date);
    if (gap === 1) {
      nextCurrent = existing.currentStreak + 1;
    } else if (gap === 2) {
      // One day missed — eligible for grace?
      const graceAvailable =
        existing.graceUsedAt === null ||
        dayDiff(existing.graceUsedAt, date) > STREAK_GRACE_COOLDOWN_DAYS;
      if (graceAvailable && existing.currentStreak > 0) {
        nextCurrent = existing.currentStreak + 1;
        nextGraceUsedAt = date;
      } else {
        nextCurrent = 1;
      }
    } else if (gap <= 0) {
      // Date is today or in the past relative to last_played — treat as
      // idempotent (defensive: clock skew, manual back-date).
      return projectStreak(existing, date);
    } else {
      // gap >= 3 — streak broken.
      nextCurrent = 1;
    }
  }

  const nextLongest = Math.max(existing.longestStreak, nextCurrent);

  await db
    .update(dailyChallengeStreaks)
    .set({
      currentStreak: nextCurrent,
      longestStreak: nextLongest,
      lastPlayedDate: date,
      graceUsedAt: nextGraceUsedAt,
      updatedAt: new Date(),
    })
    .where(eq(dailyChallengeStreaks.sessionId, sessionId));

  return projectStreak(
    {
      currentStreak: nextCurrent,
      longestStreak: nextLongest,
      lastPlayedDate: date,
      graceUsedAt: nextGraceUsedAt,
    },
    date
  );
}

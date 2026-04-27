/**
 * Pure, client-safe helpers and types for the Daily Challenge streak.
 *
 * No imports from `@/lib/db` so this module is safe to use from React
 * client components. The DB-touching functions live in `streak.ts`
 * (server-only).
 */

export type StreakState = {
  current: number;
  longest: number;
  /** YYYY-MM-DD or null if never played. */
  lastPlayedDate: string | null;
  /** YYYY-MM-DD or null if never used. */
  graceUsedAt: string | null;
  /** True iff a grace day is available (>7d since last grace OR never used). */
  graceAvailable: boolean;
  /** True iff last play was yesterday — playing today saves it. */
  streakAtRisk: boolean;
};

export const STREAK_GRACE_COOLDOWN_DAYS = 7;

/** UTC YYYY-MM-DD for an absolute timestamp. */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Today in UTC, YYYY-MM-DD. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Parse YYYY-MM-DD into a UTC midnight Date. */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Whole-day difference (b - a) using UTC midnight; negative if a > b. */
export function dayDiff(aIso: string, bIso: string): number {
  const a = parseIsoDate(aIso);
  const b = parseIsoDate(bIso);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Add `n` days to an ISO date and return the new ISO date. */
export function addDays(iso: string, n: number): string {
  const d = parseIsoDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIsoDate(d);
}

/**
 * Project a stored row into a public-facing StreakState relative to `today`.
 * Pure function — no I/O. Exported for testing and re-use by API routes.
 */
export function projectStreak(
  row: {
    currentStreak: number;
    longestStreak: number;
    lastPlayedDate: string | null;
    graceUsedAt: string | null;
  } | null,
  today: string
): StreakState {
  if (!row || row.lastPlayedDate === null) {
    return {
      current: 0,
      longest: row?.longestStreak ?? 0,
      lastPlayedDate: null,
      graceUsedAt: row?.graceUsedAt ?? null,
      graceAvailable: true,
      streakAtRisk: false,
    };
  }

  const gap = dayDiff(row.lastPlayedDate, today);
  // gap == 0 → played today, not at risk
  // gap == 1 → played yesterday, today's the deadline
  // gap >= 2 → if no recovery played, the stored current is stale (broken)
  let current = row.currentStreak;
  if (gap >= 2) {
    // Stored current is stale once a day has been fully missed without play.
    // The DB row hasn't been touched yet — we display the user's *effective*
    // current streak as broken (0) until they recover or play.
    current = 0;
  }

  const graceAvailable =
    row.graceUsedAt === null ||
    dayDiff(row.graceUsedAt, today) > STREAK_GRACE_COOLDOWN_DAYS;

  return {
    current,
    longest: row.longestStreak,
    lastPlayedDate: row.lastPlayedDate,
    graceUsedAt: row.graceUsedAt,
    graceAvailable,
    // At-risk = streak alive but today not yet played.
    streakAtRisk: gap === 1 && row.currentStreak > 0,
  };
}

/**
 * Build a 7-day calendar (oldest → newest) of play markers for the streak
 * dot grid. We derive this from the streak row only — no per-day reads.
 *
 * Returns 7 entries ending at `today`. Each is one of:
 *   "played-today"   — today was played
 *   "played"         — within the consecutive run ending at lastPlayedDate
 *   "missed"         — outside the run / before any play
 *   "today-pending"  — today, not yet played
 */
export type StreakDay = {
  date: string;
  state: "played-today" | "played" | "missed" | "today-pending";
};

export function buildSevenDayCalendar(
  state: StreakState,
  today: string
): StreakDay[] {
  const days: StreakDay[] = [];
  const playedSet = new Set<string>();
  if (state.lastPlayedDate !== null && state.current > 0) {
    // Walk back from lastPlayedDate by current-1 days.
    for (let i = 0; i < state.current; i++) {
      playedSet.add(addDays(state.lastPlayedDate, -i));
    }
    // Note: when `graceUsedAt` falls inside the run, that day was a missed
    // day forgiven by the grace mechanism. We can't recover its exact
    // position from the row alone, so we render it as "missed" within the
    // dot grid. This is honest UX — the dot grid shows what really happened
    // on each day, not the streak math.
  } else if (state.lastPlayedDate !== null) {
    playedSet.add(state.lastPlayedDate);
  }

  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    if (d === today) {
      days.push({
        date: d,
        state: playedSet.has(d) ? "played-today" : "today-pending",
      });
    } else if (playedSet.has(d)) {
      days.push({ date: d, state: "played" });
    } else {
      days.push({ date: d, state: "missed" });
    }
  }
  return days;
}

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getAccuracyLabel } from "@/lib/challenge/scoring";
import {
  buildSevenDayCalendar,
  todayIso,
  type StreakState,
  type StreakDay,
} from "@/lib/challenge/streak-shared";

// ── Types ──────────────────────────────────────────────────────────────────────

type ChallengeMarket = {
  id: string;
  title: string;
  category: string;
  currentProbability: number;
};

type ChallengeData = {
  date: string;
  markets: ChallengeMarket[];
};

type SubmittedResult = {
  score: number;
  actual: number;
  alreadySubmitted?: boolean;
  streak?: StreakState | null;
};

type BlockTier = "hit" | "warm" | "cool" | "miss";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  const key = "tfe_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    // crypto.randomUUID is available in all modern browsers
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function scoreColor(score: number): string {
  if (score >= 90) return "var(--color-spot-green)";
  if (score >= 70) return "var(--color-accent-gold)";
  if (score >= 50) return "var(--color-ink-medium)";
  return "var(--color-spot-red)";
}

/** Tier for the on-screen CSS-square block. */
function tierForScore(score: number): BlockTier {
  if (score >= 90) return "hit";
  if (score >= 70) return "warm";
  if (score >= 50) return "cool";
  return "miss";
}

/**
 * Emoji glyph per tier — used ONLY in the clipboard share text.
 * On-screen rendering uses CSS squares (see <ResultBlock />) for screenshot
 * fidelity; emoji rendering varies wildly across platforms.
 */
function emojiForScore(score: number): string {
  if (score >= 90) return "🟩";
  if (score >= 70) return "🟨";
  if (score >= 50) return "🟧";
  return "🟥";
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

// ── Streak constants ───────────────────────────────────────────────────────────

/**
 * Milestone thresholds that trigger the celebratory toast.
 * Named for the share text and toast copy.
 * Broadsheet aesthetic — terse, declarative.
 */
const STREAK_MILESTONES: { days: number; label: string; tagline: string }[] = [
  { days: 7, label: "ONE WEEK STREAK", tagline: "The press is impressed." },
  { days: 14, label: "FORTNIGHT STREAK", tagline: "A regular subscriber now." },
  { days: 30, label: "ONE MONTH STREAK", tagline: "Senior correspondent status." },
  { days: 100, label: "CENTURY STREAK", tagline: "Editor-in-Chief, undeniably." },
];

const STREAK_MILESTONES_LS_KEY = "tfe_streak_milestones_seen";

function loadSeenMilestones(): number[] {
  try {
    const raw = localStorage.getItem(STREAK_MILESTONES_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((n): n is number => typeof n === "number");
    }
    return [];
  } catch {
    return [];
  }
}

function persistSeenMilestones(seen: number[]): void {
  try {
    localStorage.setItem(STREAK_MILESTONES_LS_KEY, JSON.stringify(seen));
  } catch {
    // best-effort — quota errors are non-fatal
  }
}

// ── CSS-square result block (the on-screen share grid) ─────────────────────────

function ResultBlock({
  tier,
  index,
  ariaLabel,
}: {
  tier: BlockTier;
  index: number;
  ariaLabel?: string;
}) {
  return (
    <span
      className="challenge-block"
      data-tier={tier}
      style={{ ["--challenge-block-i" as string]: index }}
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    />
  );
}

// ── Streak counter (top-of-card) ───────────────────────────────────────────────

function FlameIcon() {
  // Compact flame — broadsheet engraving rather than emoji.
  return (
    <svg
      className="challenge-streak-flame"
      viewBox="0 0 14 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 0c0 3-3 4-3 7a3 3 0 0 0 1.2 2.4c0-1.4.5-2.4 1.3-2.4.6 0 1 .5 1 1.4 0 .9-.5 1.4-.5 2.4a1.5 1.5 0 0 0 1.5 1.5c.5 0 1-.3 1.3-.7.5 1.4-.7 3.4-3.8 3.4A4 4 0 0 1 0 11c0-4 4-5 4-9 2 1 3 2 3 4Z" />
    </svg>
  );
}

function StreakCounter({
  streak,
  pulse,
  today,
}: {
  streak: StreakState;
  pulse: boolean;
  today: string;
}) {
  const days: StreakDay[] = useMemo(
    () => buildSevenDayCalendar(streak, today),
    [streak, today]
  );

  return (
    <div
      className="challenge-streak"
      role="group"
      aria-label={`${streak.current} day streak`}
    >
      <div className="challenge-streak-label">
        <FlameIcon />
        <span>
          DAY{" "}
          <span
            className="challenge-streak-num"
            data-pulse={pulse ? "true" : undefined}
            aria-live="polite"
          >
            {streak.current}
          </span>
        </span>
        {streak.longest > 0 ? (
          <span className="challenge-streak-best">
            Best: {streak.longest}
          </span>
        ) : null}
      </div>
      <div
        className="challenge-streak-grid"
        role="img"
        aria-label="Last seven days"
      >
        {days.map((day) => (
          <span
            key={day.date}
            className="challenge-streak-dot"
            data-day-state={day.state}
            title={day.date}
          />
        ))}
      </div>
    </div>
  );
}

function StreakBanner({ streak }: { streak: StreakState }) {
  // At-risk: streak alive but today not yet played.
  if (streak.streakAtRisk) {
    return (
      <p className="challenge-streak-banner" data-tone="risk" role="status">
        Your {streak.current}-day streak is at risk. Play today to keep it.
      </p>
    );
  }
  // Recently broken (current = 0, has a longest > 0, grace not used recently).
  if (
    streak.current === 0 &&
    streak.longest > 0 &&
    streak.graceAvailable
  ) {
    return (
      <p className="challenge-streak-banner" role="status">
        Use your grace day — play now to recover your streak.
      </p>
    );
  }
  return null;
}

// ── Score reveal (per-step) ────────────────────────────────────────────────────

function ScoreReveal({
  score,
  actual,
  predicted,
}: {
  score: number;
  actual: number;
  predicted: number;
}) {
  const label = getAccuracyLabel(score);
  const color = scoreColor(score);
  return (
    <div className="challenge-result" key={`reveal-${score}-${actual}`}>
      <p className="challenge-kicker" style={{ marginBottom: 6 }}>
        Result
      </p>
      <p
        className="challenge-score-stamp"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "clamp(2.5rem, 9vw, 3.5rem)",
          lineHeight: 1,
          color,
          margin: 0,
        }}
      >
        {score}
        <span
          style={{
            fontSize: "0.4em",
            fontWeight: 400,
            color: "var(--color-ink-light)",
            marginLeft: "0.25em",
          }}
        >
          / 100
        </span>
      </p>
      <p
        className="challenge-kicker"
        style={{ color, marginTop: 8, fontWeight: 700 }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-sub)",
          fontStyle: "italic",
          color: "var(--color-ink-light)",
          fontSize: "var(--type-meta-size, 13px)",
          marginTop: 10,
        }}
      >
        You said {predicted}% &middot; Market settled at {actual}%
      </p>
    </div>
  );
}

// ── Market step card ───────────────────────────────────────────────────────────

function MarketStep({
  market,
  stepIndex,
  totalSteps,
  sessionId,
  challengeDate,
  onComplete,
}: {
  market: ChallengeMarket;
  stepIndex: number;
  totalSteps: number;
  sessionId: string;
  challengeDate: string;
  onComplete: (result: SubmittedResult) => void;
}) {
  const [sliderValue, setSliderValue] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmittedResult | null>(null);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || result) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          marketId: market.id,
          predictedProbability: sliderValue,
          challengeDate,
        }),
      });
      const data: SubmittedResult = await res.json();
      setResult(data);
      // Short delay so user can read the reveal, then advance
      setTimeout(() => onComplete(data), 1800);
    } catch {
      // fail silently — still advance
      const fallback: SubmittedResult = {
        score: 0,
        actual: market.currentProbability,
      };
      setResult(fallback);
      setTimeout(() => onComplete(fallback), 1800);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    result,
    sessionId,
    market,
    sliderValue,
    challengeDate,
    onComplete,
  ]);

  const isLocked = result !== null;

  // Track gradient — ink fill up to slider value, hairline rule beyond.
  const trackBg = `linear-gradient(to right, var(--color-ink) 0%, var(--color-ink) ${sliderValue}%, var(--color-rule) ${sliderValue}%, var(--color-rule) 100%)`;

  return (
    <div data-dragging={isDragging || undefined}>
      {/* Step counter + category */}
      <div className="flex items-center justify-between mb-4">
        <span className="challenge-kicker">
          Question {stepIndex + 1} <span aria-hidden>·</span>{" "}
          {totalSteps}
        </span>
        <span
          className="challenge-kicker"
          style={{
            border: "1px solid var(--color-rule)",
            padding: "4px 8px",
            color: "var(--color-ink-light)",
          }}
        >
          {CATEGORY_LABELS[market.category] ?? market.category}
        </span>
      </div>

      {/* Progress bar — hairline track, accent-red fill (stop-the-presses) */}
      <div
        className="h-px mb-6 relative overflow-hidden"
        style={{ background: "var(--color-rule)" }}
        role="progressbar"
        aria-valuenow={stepIndex}
        aria-valuemin={0}
        aria-valuemax={totalSteps}
      >
        <div
          className="h-full"
          style={{
            width: `${(stepIndex / totalSteps) * 100}%`,
            background: "var(--color-accent-red)",
            transition: "width var(--motion-slow, 320ms) var(--ease-set, cubic-bezier(0.16,1,0.3,1))",
          }}
        />
      </div>

      {/* Market title */}
      <h2
        className="challenge-headline"
        style={{
          marginBottom: 16,
          fontSize: "clamp(1.25rem, 5vw, 1.75rem)",
        }}
      >
        {market.title}
      </h2>

      {/* Current odds chip */}
      <div
        className="inline-block mb-6"
        style={{
          border: "1px solid var(--color-rule)",
          padding: "6px 12px",
          fontFamily: "var(--font-sub)",
          fontStyle: "italic",
          fontSize: "var(--type-meta-size, 13px)",
          color: "var(--color-ink-medium)",
        }}
      >
        Current market odds:{" "}
        <strong
          className="challenge-tabular not-italic"
          style={{
            fontFamily: "var(--font-data)",
            color: "var(--color-ink)",
            fontWeight: 700,
          }}
        >
          {market.currentProbability}%
        </strong>
      </div>

      {/* Slider section */}
      <div className="mb-6">
        <label
          htmlFor={`slider-${market.id}`}
          className="challenge-kicker block mb-3"
        >
          Where will this market resolve?
        </label>

        {/* Slider value display — display serif, tabular, leans on drag */}
        <div className="text-center mb-3">
          <span
            className="challenge-tabular"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "clamp(2.5rem, 9vw, 3.5rem)",
              lineHeight: 1,
              color: isLocked ? "var(--color-ink-faded)" : "var(--color-ink)",
              display: "inline-block",
              transform: isDragging ? "translateY(-1px)" : "translateY(0)",
              transition:
                "transform var(--motion-fast, 120ms) var(--ease-stamp, cubic-bezier(0.4,0,0.2,1))",
            }}
          >
            {sliderValue}
            <span
              style={{
                fontSize: "0.4em",
                color: "var(--color-ink-light)",
                fontWeight: 400,
              }}
            >
              %
            </span>
          </span>
        </div>

        <input
          id={`slider-${market.id}`}
          type="range"
          min={0}
          max={100}
          step={1}
          value={sliderValue}
          disabled={isLocked}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          onPointerCancel={() => setIsDragging(false)}
          onBlur={() => setIsDragging(false)}
          className="challenge-slider"
          style={
            {
              "--challenge-track-bg": trackBg,
            } as React.CSSProperties
          }
          aria-label="Predicted final probability"
          aria-valuetext={`${sliderValue} percent`}
        />

        {/* Scale labels */}
        <div
          className="flex justify-between mt-1 challenge-kicker"
          style={{ color: "var(--color-ink-faded)" }}
          aria-hidden
        >
          <span>Impossible</span>
          <span>50/50</span>
          <span>Certain</span>
        </div>
      </div>

      {/* Submit button */}
      {!isLocked && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="challenge-button"
        >
          {isSubmitting ? "Locking In…" : "Lock In Prediction"}
        </button>
      )}

      {/* Score reveal */}
      {result && (
        <ScoreReveal
          score={result.score}
          actual={result.actual}
          predicted={sliderValue}
        />
      )}
    </div>
  );
}

// ── Final summary ──────────────────────────────────────────────────────────────

function FinalSummary({
  results,
  date,
  streak,
}: {
  results: SubmittedResult[];
  date: string;
  streak: StreakState | null;
}) {
  const [copied, setCopied] = useState(false);

  const total = results.reduce((sum, r) => sum + r.score, 0);
  const max = results.length * 100;
  const overallScore = Math.round(total / Math.max(results.length, 1));
  const overallLabel = getAccuracyLabel(overallScore);
  const overallPct = Math.round((total / Math.max(max, 1)) * 100);

  // CRITICAL: the clipboard payload keeps Unicode emoji blocks so that
  // Twitter / Discord / WhatsApp render them correctly when pasted.
  // The on-screen rendering (below) is decoupled — it uses CSS squares.
  const shareEmojiBlocks = useMemo(
    () => results.map((r) => emojiForScore(r.score)).join(""),
    [results]
  );

  // Compact share text — adds a streak line at the top when active.
  const shareText = useMemo(() => {
    const lines: string[] = [`The Future Express · ${date}`];
    if (streak && streak.current > 0) {
      lines.push(`🔥 DAY ${streak.current}`);
    }
    lines.push(shareEmojiBlocks);
    lines.push(`SCORE: ${overallPct}%`);
    lines.push("https://thefutureexpress.com/challenge");
    return lines.join("\n");
  }, [date, streak, shareEmojiBlocks, overallPct]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — no-op; copy is best-effort
    }
  }, [shareText]);

  return (
    <div>
      {/* "EXTRA" stamp header */}
      <div className="challenge-result" style={{ marginTop: 0 }}>
        <p className="challenge-kicker" style={{ marginBottom: 8 }}>
          Result
        </p>
        <p
          className="challenge-score-stamp challenge-tabular"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(3rem, 14vw, 5.5rem)",
            lineHeight: 1,
            color: "var(--color-ink)",
            margin: 0,
          }}
          aria-label={`Total score ${total} out of ${max}`}
        >
          {total}
          <span
            style={{
              fontSize: "0.36em",
              fontWeight: 400,
              color: "var(--color-ink-light)",
            }}
          >
            /{max}
          </span>
        </p>
        <p
          className="challenge-kicker"
          style={{
            color: scoreColor(overallScore),
            marginTop: 10,
            fontWeight: 700,
          }}
        >
          {overallLabel}
        </p>

        {/* CSS-square share grid — replaces 🟩🟨🟧🟥 on-screen.
            Clipboard share text above keeps the emoji for paste fidelity. */}
        <div
          className="challenge-grid"
          role="group"
          aria-label="Per-market accuracy"
        >
          {results.map((r, i) => (
            <ResultBlock
              key={i}
              tier={tierForScore(r.score)}
              index={i}
              ariaLabel={`Market ${i + 1}: ${r.score} of 100`}
            />
          ))}
        </div>
      </div>

      {/* Per-market box-score */}
      <table
        className="w-full"
        style={{
          marginTop: 28,
          borderCollapse: "collapse",
          fontFamily: "var(--font-sub)",
        }}
      >
        <caption className="challenge-kicker" style={{ textAlign: "left", paddingBottom: 8 }}>
          Box Score
        </caption>
        <tbody>
          {results.map((r, i) => (
            <tr
              key={i}
              style={{
                borderTop: "1px solid var(--color-rule)",
              }}
            >
              <td
                style={{
                  padding: "10px 0",
                  fontStyle: "italic",
                  color: "var(--color-ink-medium)",
                  fontSize: "var(--type-meta-size, 13px)",
                }}
              >
                Market {i + 1}
              </td>
              <td
                className="challenge-tabular"
                style={{
                  padding: "10px 0",
                  textAlign: "right",
                  fontFamily: "var(--font-data)",
                  color: "var(--color-ink-light)",
                  fontSize: "var(--type-meta-size, 13px)",
                }}
              >
                {r.actual}%
              </td>
              <td
                className="challenge-tabular"
                style={{
                  padding: "10px 0 10px 16px",
                  textAlign: "right",
                  fontFamily: "var(--font-data)",
                  color: scoreColor(r.score),
                  fontWeight: 700,
                  fontSize: "var(--type-meta-size, 14px)",
                  whiteSpace: "nowrap",
                }}
              >
                {r.score}/100
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Share button */}
      <div style={{ marginTop: 28 }}>
        <button
          type="button"
          onClick={handleShare}
          className="challenge-button"
          aria-live="polite"
        >
          {copied ? "Copied to Clipboard" : "Share Results"}
        </button>
      </div>

      <p
        className="text-center"
        style={{
          fontFamily: "var(--font-sub)",
          fontStyle: "italic",
          color: "var(--color-ink-light)",
          fontSize: "var(--type-meta-size, 13px)",
          marginTop: 16,
        }}
      >
        Come back tomorrow for a new edition.
      </p>
    </div>
  );
}

// ── Milestone toast ────────────────────────────────────────────────────────────

function MilestoneToast({
  milestone,
  onDismiss,
}: {
  milestone: { days: number; label: string; tagline: string };
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="challenge-milestone-toast"
      role="status"
      aria-live="polite"
      onClick={onDismiss}
    >
      {milestone.label}
      <small>{milestone.tagline}</small>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DailyChallenge({ initial }: { initial: ChallengeData }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<SubmittedResult[]>([]);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [streakPulse, setStreakPulse] = useState(false);
  const [milestone, setMilestone] = useState<
    (typeof STREAK_MILESTONES)[number] | null
  >(null);
  const lastStreakValueRef = useRef<number>(0);
  const isDone = results.length === initial.markets.length;

  // Bootstrap session id (client-side only).
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  // Fetch initial streak once we have the session id.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/challenge/streak?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as StreakState;
        if (!cancelled) {
          setStreak(data);
          lastStreakValueRef.current = data.current;
        }
      } catch {
        // best-effort; UI degrades gracefully without streak
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleStepComplete = useCallback((result: SubmittedResult) => {
    setResults((prev) => [...prev, result]);
    setCurrentStep((prev) => prev + 1);

    // Update streak state from the submission response.
    if (result.streak) {
      const next = result.streak;
      setStreak((prev) => {
        const prevValue = prev?.current ?? lastStreakValueRef.current;
        if (next.current !== prevValue) {
          setStreakPulse(true);
          // Clear pulse after the animation completes.
          setTimeout(() => setStreakPulse(false), 360);
        }
        return next;
      });
      lastStreakValueRef.current = next.current;

      // Milestone check — only fire crossings, only once per session.
      const seen = loadSeenMilestones();
      const crossed = STREAK_MILESTONES.find(
        (m) => next.current >= m.days && !seen.includes(m.days)
      );
      if (crossed) {
        setMilestone(crossed);
        persistSeenMilestones([...seen, crossed.days]);
      }
    }
  }, []);

  return (
    <div
      className="max-w-xl mx-auto px-4 py-8"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Masthead-style header */}
      <header
        className="text-center mb-8 pb-6"
        style={{ borderBottom: "var(--rule-double, 3px double var(--color-rule-dark))" }}
      >
        <p className="challenge-kicker" style={{ marginBottom: 8 }}>
          The Future Express
        </p>
        <h1 className="challenge-headline">Daily Prediction Challenge</h1>
        <p className="challenge-date" style={{ marginTop: 8 }}>
          {formatDate(initial.date)}
        </p>
        <span className="challenge-gold-rule" aria-hidden />
      </header>

      {/* Body */}
      <div className="challenge-card">
        {/* Streak counter + at-risk banner — top of card, both pre and post submit */}
        {sessionId && streak ? (
          <>
            <StreakCounter
              streak={streak}
              pulse={streakPulse}
              today={todayIso()}
            />
            <StreakBanner streak={streak} />
          </>
        ) : null}

        {!sessionId ? (
          <p
            style={{
              textAlign: "center",
              color: "var(--color-ink-light)",
              fontFamily: "var(--font-sub)",
              fontStyle: "italic",
              padding: "32px 0",
            }}
          >
            Loading challenge…
          </p>
        ) : isDone ? (
          <FinalSummary results={results} date={initial.date} streak={streak} />
        ) : (
          <MarketStep
            key={currentStep}
            market={initial.markets[currentStep]}
            stepIndex={currentStep}
            totalSteps={initial.markets.length}
            sessionId={sessionId}
            challengeDate={initial.date}
            onComplete={handleStepComplete}
          />
        )}
      </div>

      {/* Footer note */}
      {!isDone && (
        <p
          className="challenge-kicker text-center"
          style={{
            color: "var(--color-ink-faded)",
            marginTop: 24,
          }}
        >
          One edition per day &mdash; predictions are anonymous
        </p>
      )}

      {/* Milestone toast (broadsheet, not bird) */}
      {milestone ? (
        <MilestoneToast
          milestone={milestone}
          onDismiss={() => setMilestone(null)}
        />
      ) : null}
    </div>
  );
}

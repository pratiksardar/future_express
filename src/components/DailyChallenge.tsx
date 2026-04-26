"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAccuracyLabel } from "@/lib/challenge/scoring";

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
}: {
  results: SubmittedResult[];
  date: string;
}) {
  const [copied, setCopied] = useState(false);

  const total = results.reduce((sum, r) => sum + r.score, 0);
  const max = results.length * 100;
  const overallScore = Math.round(total / Math.max(results.length, 1));
  const overallLabel = getAccuracyLabel(overallScore);

  // CRITICAL: the clipboard payload keeps Unicode emoji blocks so that
  // Twitter / Discord / WhatsApp render them correctly when pasted.
  // The on-screen rendering (below) is decoupled — it uses CSS squares.
  const shareEmojiBlocks = useMemo(
    () => results.map((r) => emojiForScore(r.score)).join(""),
    [results]
  );

  const shareText = `Daily Prediction Challenge 🔮\n${formatDate(date)}\n${shareEmojiBlocks}\nScore: ${total}/${max}\nPlay at thefutureexpress.com/challenge`;

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

// ── Main component ─────────────────────────────────────────────────────────────

export function DailyChallenge({ initial }: { initial: ChallengeData }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<SubmittedResult[]>([]);
  const isDone = results.length === initial.markets.length;

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const handleStepComplete = useCallback((result: SubmittedResult) => {
    setResults((prev) => [...prev, result]);
    setCurrentStep((prev) => prev + 1);
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
          <FinalSummary results={results} date={initial.date} />
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
    </div>
  );
}

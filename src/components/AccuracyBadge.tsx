type AccuracyBadgeProps = {
  probabilityAtPublish: number;
  currentProbability: number;
  resolutionOutcome?: string | null;
  size?: "sm" | "md";
};

export function AccuracyBadge({
  probabilityAtPublish,
  currentProbability,
  resolutionOutcome,
  size = "sm",
}: AccuracyBadgeProps) {
  const delta = currentProbability - probabilityAtPublish;
  const absDelta = Math.abs(delta);

  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const py = size === "sm" ? "py-0.5" : "py-1";

  // Resolved market
  if (resolutionOutcome) {
    const outcomeIsYes = resolutionOutcome.toLowerCase() === "yes";
    const implied = probabilityAtPublish >= 50 ? "yes" : "no";
    const correct = implied === resolutionOutcome.toLowerCase();

    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 ${py} ${textSize} font-bold uppercase tracking-wider font-[family-name:var(--font-ui)] rounded-sm`}
        style={{
          color: correct ? "var(--color-spot-green)" : "var(--color-spot-red)",
          backgroundColor: correct
            ? "rgba(26, 107, 60, 0.1)"
            : "rgba(139, 28, 28, 0.1)",
        }}
      >
        {correct ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        )}
        {correct ? "Called It" : "Missed"}
        <span className="font-normal opacity-75">
          {probabilityAtPublish}%{outcomeIsYes ? " YES" : " NO"}
        </span>
      </span>
    );
  }

  // Active market: show movement
  if (absDelta < 5) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 ${py} ${textSize} font-bold uppercase tracking-wider font-[family-name:var(--font-ui)] text-[var(--color-ink-light)] rounded-sm`}
        style={{ backgroundColor: "rgba(0,0,0,0.04)" }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Holding Steady
      </span>
    );
  }

  const rising = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 ${py} ${textSize} font-bold uppercase tracking-wider font-[family-name:var(--font-ui)] rounded-sm`}
      style={{
        color: rising ? "var(--color-spot-green)" : "var(--color-spot-red)",
        backgroundColor: rising
          ? "rgba(26, 107, 60, 0.1)"
          : "rgba(139, 28, 28, 0.1)",
      }}
    >
      {rising ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      )}
      {rising ? "Odds Rising" : "Odds Falling"}
      <span className="font-[family-name:var(--font-data)] tabular-nums font-normal">
        {rising ? "+" : ""}{Math.round(delta)}
      </span>
    </span>
  );
}

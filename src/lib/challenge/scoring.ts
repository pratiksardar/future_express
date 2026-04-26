/**
 * Score = max(0, 100 - |predicted - actual| * 2)
 * Perfect score: 100 (exact match)
 * Off by 50+: 0
 */
export function scorePrediction(predicted: number, actual: number): number {
  return Math.max(0, 100 - Math.abs(predicted - actual) * 2);
}

export function getAccuracyLabel(score: number): string {
  if (score >= 90) return "Oracle";
  if (score >= 70) return "Sharp";
  if (score >= 50) return "On Track";
  return "Learning";
}

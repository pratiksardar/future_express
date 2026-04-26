/**
 * Generates an HTML iframe embed snippet for a single prediction market widget.
 *
 * @param marketId  - The UUID of the market (from the markets table)
 * @param baseUrl   - The base URL of the deployment, e.g. "https://futureexpress.xyz"
 * @returns         - A ready-to-paste HTML `<iframe>` snippet
 *
 * @example
 *   generateEmbedCode("abc-123", "https://futureexpress.xyz")
 *   // => '<iframe src="https://futureexpress.xyz/widget/abc-123" width="300" height="200" frameborder="0" loading="lazy" title="Prediction Market Widget — The Future Express"></iframe>'
 */
export function generateEmbedCode(marketId: string, baseUrl: string): string {
  // Normalise: strip trailing slash from baseUrl
  const base = baseUrl.replace(/\/$/, "");
  const src = `${base}/widget/${encodeURIComponent(marketId)}`;

  return [
    `<iframe`,
    `  src="${src}"`,
    `  width="300"`,
    `  height="200"`,
    `  frameborder="0"`,
    `  loading="lazy"`,
    `  title="Prediction Market Widget — The Future Express"`,
    `></iframe>`,
  ].join("\n");
}

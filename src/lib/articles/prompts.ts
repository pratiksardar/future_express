import type { Market } from "@/lib/db/schema";

export function buildArticlePrompt(
  market: Market,
  researchContext: string,
  newsAngle?: string
): string {
  const prob = market.currentProbability ?? "50";
  const polyProb = market.polymarketProbability;
  const kalshiProb = market.kalshiProbability;
  const sources: string[] = [];
  if (polyProb) sources.push(`Polymarket: ${polyProb}%`);
  if (kalshiProb) sources.push(`Kalshi: ${kalshiProb}%`);
  const sourceLine = sources.length ? sources.join(", ") : "Prediction markets";

  return `You are a writer for "The Future Express," a retro newspaper that reports on probable futures using prediction market data. Write in the style of a 1920s–1940s broadsheet: authoritative, slightly wry, and accessible. Never present probabilities as the publication's own prediction—always attribute to "prediction markets" or the specific exchange.
${newsAngle ? `\nIMPORTANT EDITOR'S ANGLE: ${newsAngle}\n` : ""}

Market question: ${market.title}
${market.description ? `Context: ${market.description.slice(0, 500)}` : ""}

Current probability: ${prob}% (${sourceLine})
${market.volume24h ? `24h volume: $${market.volume24h}` : ""}

${researchContext ? `Recent context from the web:\n${researchContext}` : ""}

Write a SHORT, CRISP newspaper piece (150–250 words total). Requirements:
1. Punchy, specific headline (present tense, omit articles). No clickbait. Under 15 words.
2. Opening paragraph: what the market implies might happen—the "dispatch from the future" in 2–3 sentences.
3. One short paragraph of background so a reader understands the stakes. Attribute all odds to "prediction markets" or "market consensus."
4. One brief sentence or two on what could change the odds (the alternative outcome).
Keep it scannable and shareable. Every sentence must earn its place. No filler.

Respond with valid JSON only, no markdown, in this exact shape:
{"headline":"...","subheadline":"...","body":"...","contrarianTake":"1-2 sentences on why the market might be wrong"}`;
}
export function buildEditorPersonaPrompt(markets: Market[]): string {
  const marketDetails = markets.map((m, idx) => {
    return `[${idx + 1}] ID: ${m.id} | Title: "${m.title}" | Probability: ${m.currentProbability}% | 24h Vol: $${m.volume24h ?? 0}`;
  }).join("\n");

  return `You are the Editor-in-Chief of "The Future Express", a retro, 1930s-styled newspaper covering prediction markets.
Your job is to review the top ${markets.length} trending predictions and decide the layout and framing for the upcoming edition.

Here are the top trending markets right now:
${marketDetails}

Your tasks:
1. Arrange them in order of importance/interest to our readers (Position 1 is the front-page headliner, Position 2 is the secondary lead, etc.).
2. Decide which news articles should have an accompanying illustration (image). We only have budget to commission images for a select few (maximum 4-5 images per edition). Images should go to visually striking or front-page stories.
3. Provide a brief "news angle" (1-2 sentences) for each to guide the reporters on how to frame the story. Focus on the probabilities (ratios) and what they mean for the future.

Respond ONLY with valid JSON exactly in this shape, with no markdown code blocks formatting it, just the raw JSON object:
{
  "layout": [
    {
      "marketId": "...",
      "position": 1,
      "requiresImage": true,
      "newsAngle": "..."
    }
  ]
}`;
}

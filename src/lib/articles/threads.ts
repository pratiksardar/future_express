/**
 * AI Twitter thread generator.
 * Auto-generates 6-tweet threads from articles for social media distribution.
 */

import { db } from "@/lib/db";
import { articles, markets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { chatCompletion } from "./llm";
import { loggers } from "@/lib/logger";
import { getAppUrl } from "@/lib/url";

export type TweetThread = {
  tweets: Array<{
    position: number;
    text: string;
    type: "hook" | "context" | "data" | "stakes" | "contrarian" | "cta";
  }>;
};

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) return jsonBlock[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last >= first) return trimmed.slice(first, last + 1);
  return trimmed;
}

export async function generateThread(
  articleId: string
): Promise<{ success: boolean; thread?: TweetThread; error?: string }> {
  const rows = await db
    .select({
      headline: articles.headline,
      subheadline: articles.subheadline,
      body: articles.body,
      slug: articles.slug,
      contrarianTake: articles.contrarianTake,
      category: articles.category,
      marketTitle: markets.title,
      currentProbability: markets.currentProbability,
      polymarketProbability: markets.polymarketProbability,
      kalshiProbability: markets.kalshiProbability,
      volume24h: markets.volume24h,
    })
    .from(articles)
    .innerJoin(markets, eq(articles.marketId, markets.id))
    .where(eq(articles.id, articleId))
    .limit(1);

  const row = rows[0];
  if (!row) return { success: false, error: "Article not found" };

  const prob = row.currentProbability ?? "50";
  const sources: string[] = [];
  if (row.polymarketProbability) sources.push(`Polymarket: ${row.polymarketProbability}%`);
  if (row.kalshiProbability) sources.push(`Kalshi: ${row.kalshiProbability}%`);

  const appUrl = getAppUrl();
  const articleUrl = `${appUrl}/article/${row.slug}`;

  const prompt = `You are the social media voice of "The Future Express," a prediction market newspaper.
Your tone is: confident, slightly provocative, data-driven, and wry. You speak like a sharp
financial journalist who also has a sense of humor. Never hedge excessively. Be direct.

Generate a Twitter/X thread (6 tweets) for this article:

TWEET 1 (HOOK): A provocative, scroll-stopping statement or question. Use the probability as shock value.
  - Start with an attention-grabbing opener. No "Thread:" or numbering.
  - Max 250 characters. Leave room for engagement.

TWEET 2 (CONTEXT): What is this prediction about? Who cares and why?
  - Plain English. No jargon. Make it accessible. Max 270 characters.

TWEET 3 (DATA): The specific numbers. What do the markets say?
  - Reference actual probability. If both Polymarket and Kalshi data exist, mention the spread.
  - Max 270 characters.

TWEET 4 (STAKES): What happens if this prediction comes true? Real-world consequences.
  - Make it tangible and human. Max 270 characters.

TWEET 5 (CONTRARIAN): Why the market might be WRONG. The devil's advocate take.
  - People love arguing. Give them ammunition. Max 270 characters.

TWEET 6 (CTA): Drive to the article. Include a question that invites replies.
  - End with the link. Max 250 characters.

ARTICLE:
Headline: ${row.headline}
Body: ${row.body.slice(0, 500)}
${row.contrarianTake ? `Contrarian angle: ${row.contrarianTake}` : ""}

MARKET:
Question: ${row.marketTitle}
Probability: ${prob}% (${sources.join(", ") || "prediction markets"})
${row.volume24h ? `24h volume: $${row.volume24h}` : ""}

IMPORTANT: In tweet 6, use this exact URL: ${articleUrl}

Respond with valid JSON only:
{
  "tweets": [
    { "position": 1, "text": "...", "type": "hook" },
    { "position": 2, "text": "...", "type": "context" },
    { "position": 3, "text": "...", "type": "data" },
    { "position": 4, "text": "...", "type": "stakes" },
    { "position": 5, "text": "...", "type": "contrarian" },
    { "position": 6, "text": "...", "type": "cta" }
  ]
}`;

  try {
    const result = await chatCompletion({
      messages: [{ role: "user", content: prompt }],
      jsonMode: true,
      temperature: 0.8,
    });

    const cleaned = extractJson(result.content);
    const parsed = JSON.parse(cleaned) as TweetThread;

    if (!parsed.tweets || !Array.isArray(parsed.tweets) || parsed.tweets.length < 4) {
      return { success: false, error: "Invalid thread structure from LLM" };
    }

    // Truncate any tweet over 280 chars
    for (const tweet of parsed.tweets) {
      if (tweet.text.length > 280) {
        tweet.text = tweet.text.slice(0, 277) + "...";
      }
    }

    loggers.articles.info(
      { articleId, tweetCount: parsed.tweets.length, provider: result.provider },
      "Twitter thread generated"
    );

    return { success: true, thread: parsed };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Thread generation failed";
    loggers.articles.error({ err: e, articleId }, "Thread generation failed");
    return { success: false, error: message };
  }
}

/**
 * Generate threads for all articles in an edition.
 * Returns the threads keyed by articleId for display/scheduling.
 */
export async function generateThreadsForEdition(
  articleIds: string[]
): Promise<Map<string, TweetThread>> {
  const threads = new Map<string, TweetThread>();
  for (const articleId of articleIds) {
    const result = await generateThread(articleId);
    if (result.success && result.thread) {
      threads.set(articleId, result.thread);
    }
  }
  return threads;
}

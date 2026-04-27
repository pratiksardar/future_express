import { db } from "@/lib/db";
import { articles, predictions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const sessionId = "tfe_seed_called_it_demo_session";
  const slug = "prediction-markets-place-airtable-ipo-odds-at-one-in-five-2026-04-20-00";
  const [art] = await db
    .select({ id: articles.id, marketId: articles.marketId })
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);
  if (!art) throw new Error("Article not found: " + slug);
  const predictedAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const resolvedAt = new Date(Date.now() - 60 * 60 * 1000);
  const out = await db
    .insert(predictions)
    .values({
      sessionId,
      marketId: art.marketId,
      articleId: art.id,
      direction: "up",
      probabilityAtPrediction: "72.00",
      predictedAt,
      resolvedAt,
      wasCorrect: true,
      iCalledItShared: false,
    })
    .onConflictDoUpdate({
      target: [predictions.sessionId, predictions.marketId],
      set: {
        direction: "up",
        probabilityAtPrediction: "72.00",
        predictedAt,
        resolvedAt,
        wasCorrect: true,
        iCalledItShared: false,
      },
    })
    .returning();
  console.log(JSON.stringify({ sessionId, prediction: out[0] }, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

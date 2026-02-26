/**
 * Social media agent: generates playcard images from articles for Twitter/social sharing.
 * Stores images in the database (data URI in playcards.imageUrl), same pattern as articles.imageUrl.
 * Admin can access and download via the xyzzy panel; images served from GET /api/playcards/[id]/image.
 */

import { db } from "@/lib/db";
import { articles, editionArticles, playcards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generatePlaycardResponse, type PlaycardPayload } from "./playcard";
import { loggers } from "@/lib/logger";

export type GeneratePlaycardResult = {
  success: boolean;
  error?: string;
};

/**
 * Generates a playcard image for an article and stores it in the DB (imageUrl as data URI).
 * Same storage approach as news article images: image data in the database.
 */
export async function generateAndSavePlaycard(articleId: string): Promise<GeneratePlaycardResult> {
  const [row] = await db
    .select({
      id: articles.id,
      headline: articles.headline,
      subheadline: articles.subheadline,
      slug: articles.slug,
      category: articles.category,
      imageUrl: articles.imageUrl,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!row) {
    return { success: false, error: "Article not found" };
  }

  const publishedAt = row.publishedAt
    ? new Date(row.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : undefined;

  const payload: PlaycardPayload = {
    headline: row.headline,
    subheadline: row.subheadline,
    imageUrl: row.imageUrl,
    slug: row.slug,
    category: row.category,
    publishedAt,
  };

  try {
    const response = await generatePlaycardResponse(payload);
    const buffer = Buffer.from(await response.arrayBuffer());
    const dataUri = `data:image/png;base64,${buffer.toString("base64")}`;

    await db
      .insert(playcards)
      .values({ articleId: row.id, imageUrl: dataUri })
      .onConflictDoUpdate({
        target: playcards.articleId,
        set: { imageUrl: dataUri },
      });

    loggers.articles.info({ articleId }, "Playcard generated and stored in DB");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    loggers.articles.error({ err: e, articleId }, "Playcard generation failed");
    return { success: false, error: message };
  }
}

/**
 * Generates playcards for all articles in an edition.
 * Called after runEditionPipeline so each new edition gets social cards.
 */
export async function runSocialAgentForEdition(editionId: string): Promise<{
  generated: number;
  failed: number;
  errors: string[];
}> {
  const links = await db
    .select({ articleId: editionArticles.articleId })
    .from(editionArticles)
    .where(eq(editionArticles.editionId, editionId));

  const errors: string[] = [];
  let generated = 0;
  let failed = 0;

  for (const { articleId } of links) {
    const result = await generateAndSavePlaycard(articleId);
    if (result.success) generated++;
    else {
      failed++;
      if (result.error) errors.push(`${articleId}: ${result.error}`);
    }
  }

  return { generated, failed, errors };
}

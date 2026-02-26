/**
 * Social media agent: generates playcard images from articles for Twitter/social sharing.
 * Saves images to public/playcards and records them in the playcards table.
 * Admin can access and download via the xyzzy panel in the UI.
 */

import { db } from "@/lib/db";
import { articles, editionArticles, playcards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generatePlaycardResponse, type PlaycardPayload } from "./playcard";
import { loggers } from "@/lib/logger";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const PLAYCARDS_DIR = "public/playcards";
const PLAYCARDS_WEB_PATH = "/playcards";

export type GeneratePlaycardResult = {
  success: boolean;
  filePath?: string;
  error?: string;
};

/**
 * Generates a playcard image for an article and saves it to public/playcards.
 * Idempotent per article: if a playcard already exists for this article, skips (or overwrite by design).
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

    const cwd = process.cwd();
    const dir = path.join(cwd, PLAYCARDS_DIR);
    await mkdir(dir, { recursive: true });

    const safeSlug = row.slug.replace(/[^a-z0-9-]/gi, "-").slice(0, 80);
    const filename = `${row.id}-${safeSlug}.png`;
    const filePath = path.join(dir, filename);
    await writeFile(filePath, buffer);

    const webPath = `${PLAYCARDS_WEB_PATH}/${filename}`;

    await db
      .insert(playcards)
      .values({ articleId: row.id, filePath: webPath })
      .onConflictDoUpdate({
        target: playcards.articleId,
        set: { filePath: webPath },
      });

    loggers.articles.info({ articleId, filePath: webPath }, "Playcard generated");
    return { success: true, filePath: webPath };
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

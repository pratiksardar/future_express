/**
 * Hedera publish-log helper. Owns the post-publish "edition_published"
 * payload contract and the DB write-back of the resulting transaction id.
 *
 * Design contract:
 *   - Hedera failures NEVER block the publish pipeline. Publish is the
 *     canonical action; Hedera is the receipt. Caller invokes this AFTER
 *     articles are persisted; we wrap the Hedera client call in try/catch
 *     and always return either the TX id or null.
 *   - On success we update editions.hedera_tx and editions.hedera_published_at
 *     so /transparency can read the canonical TX from the DB without a
 *     mirror-node roundtrip on every render.
 *   - If HEDERA_ACCOUNT_ID/HEDERA_PRIVATE_KEY/HEDERA_TOPIC_ID are unset,
 *     the underlying client returns success:false and we no-op (returning
 *     null). The transparency page will fall back to "no-dispatch-yet".
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles, editions } from "@/lib/db/schema";
import { loggers } from "@/lib/logger";
import { logEditorialDecision } from "./client";

export type EditionPublishedInput = {
  editionId: string;
  volumeNumber: number | null;
  publishedAt: Date;
  articleIds: string[];
};

export type EditionPublishedPayload = {
  type: "edition_published";
  editionId: string;
  volumeNumber: number | null;
  publishedAt: string;
  articleCount: number;
  articleSlugs: string[];
  agentEmail: string;
  walletAddress: string | null;
  agentVersion: string;
};

const AGENT_EMAIL = "editor@futureexpress.eth";

async function loadArticleSlugs(articleIds: string[]): Promise<string[]> {
  if (articleIds.length === 0) return [];
  // We do an array-batch fetch via inArray to keep the DB roundtrip O(1).
  // (Importing inArray here avoids polluting the call site.)
  const { inArray } = await import("drizzle-orm");
  const rows = await db
    .select({ id: articles.id, slug: articles.slug })
    .from(articles)
    .where(inArray(articles.id, articleIds));
  // Preserve caller-supplied order; the layout ordering is meaningful.
  const bySlug = new Map(rows.map((r) => [r.id, r.slug]));
  return articleIds.map((id) => bySlug.get(id)).filter((s): s is string => Boolean(s));
}

/**
 * Build the canonical edition_published payload, submit it to Hedera, and
 * persist the resulting TX id to the editions row.
 *
 * Returns the canonical TX id on success, or null on any failure. Never throws.
 */
export async function logEditionPublishedToHedera(
  input: EditionPublishedInput,
): Promise<string | null> {
  let payload: EditionPublishedPayload;
  try {
    const articleSlugs = await loadArticleSlugs(input.articleIds);
    payload = {
      type: "edition_published",
      editionId: input.editionId,
      volumeNumber: input.volumeNumber,
      publishedAt: input.publishedAt.toISOString(),
      articleCount: articleSlugs.length,
      articleSlugs,
      agentEmail: AGENT_EMAIL,
      walletAddress: process.env.EDITOR_WALLET_ADDRESS?.trim() || null,
      agentVersion: process.env.npm_package_version ?? "unknown",
    };
  } catch (err) {
    loggers.hedera.warn(
      { err: err instanceof Error ? err.message : String(err), editionId: input.editionId },
      "Could not assemble edition_published payload — skipping Hedera log",
    );
    return null;
  }

  let result;
  try {
    result = await logEditorialDecision(payload);
  } catch (err) {
    // logEditorialDecision swallows internally, but defense-in-depth here
    // ensures the publish pipeline never sees a thrown Hedera error.
    loggers.hedera.warn(
      { err: err instanceof Error ? err.message : String(err), editionId: input.editionId },
      "Hedera client threw unexpectedly — continuing without receipt",
    );
    return null;
  }

  if (!result.success || !result.transactionId) {
    loggers.hedera.warn(
      { editionId: input.editionId, error: result.error },
      "Hedera log returned no transaction id — skipping DB write-back",
    );
    return null;
  }

  // Persist the TX back to the edition row so /transparency can read it.
  try {
    await db
      .update(editions)
      .set({
        hederaTx: result.transactionId,
        hederaPublishedAt: new Date(result.submittedAt ?? Date.now()),
      })
      .where(eq(editions.id, input.editionId));
    loggers.hedera.info(
      { editionId: input.editionId, transactionId: result.transactionId },
      "Persisted Hedera TX to editions row",
    );
  } catch (err) {
    loggers.hedera.warn(
      {
        err: err instanceof Error ? err.message : String(err),
        editionId: input.editionId,
        transactionId: result.transactionId,
      },
      "Failed to persist Hedera TX to editions row — TX is still live on-chain",
    );
    // Still return the TX id; the on-chain write succeeded.
  }

  return result.transactionId;
}

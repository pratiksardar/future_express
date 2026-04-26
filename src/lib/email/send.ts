/**
 * Email digest sender — builds the per-edition payload and ships it via Resend.
 *
 * Provider: Resend (chosen for native React Email support, generous free tier,
 * one-env-var setup). Provider keys live in `RESEND_API_KEY`.
 *
 * Surface guarantees enforced here:
 *   - The subject line uses broadsheet voice — no emoji, no ASCII art.
 *   - The HTML body is rendered from `DigestEmail` (broadsheet typography only).
 *   - If `RESEND_API_KEY` is unset we DO NOT crash — we log and skip. The cron
 *     calls into us, and a missing key in dev/preview must not break Inngest.
 */
import { Resend } from "resend";
import { render } from "@react-email/components";
import { db } from "@/lib/db";
import {
  articles,
  editions,
  editionArticles,
  markets,
  subscribers,
  dailyChallenges,
  type Subscriber,
} from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getAppUrl } from "@/lib/url";
import {
  DigestEmail,
  type DigestChallenge,
  type DigestContent,
  type DigestStory,
} from "./digest";

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? "The Future Express <digest@thefutureexpress.com>";

const REPLY_TO = process.env.RESEND_REPLY_TO ?? null;

let cachedClient: Resend | null = null;
function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new Resend(key);
  return cachedClient;
}

// ── Date formatting ──────────────────────────────────────────────────────

function formatDispatchDate(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  // e.g. "Sunday, April 26, 2026". Broadsheet voice — no rewrite needed.
  return fmt.format(now);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Build digest content ─────────────────────────────────────────────────

/**
 * Build the digest payload from the latest edition.
 * - Picks the most recently published edition (any type).
 * - Pulls its top 5 articles, ordered by `position` if available,
 *   else by `publishedAt`.
 * - Includes today's daily challenge if one exists.
 *
 * NOTE: The unsubscribeToken in the returned content is a placeholder —
 * the per-recipient token is injected when the email is actually sent.
 */
export async function buildDigestContent(): Promise<DigestContent> {
  const baseUrl = getAppUrl();

  // Latest edition by publishedAt
  const [latestEdition] = await db
    .select({
      id: editions.id,
      type: editions.type,
      volumeNumber: editions.volumeNumber,
      publishedAt: editions.publishedAt,
    })
    .from(editions)
    .orderBy(desc(editions.publishedAt))
    .limit(1);

  // Stories: prefer ordered-by-position via edition_articles, else fall back
  // to most-recent articles overall.
  let storyRows: Array<{
    headline: string;
    subheadline: string | null;
    slug: string;
    category: string;
    probability: string | null;
  }> = [];

  if (latestEdition) {
    const ordered = await db
      .select({
        headline: articles.headline,
        subheadline: articles.subheadline,
        slug: articles.slug,
        category: articles.category,
        probability: articles.probabilityAtPublish,
        position: editionArticles.position,
      })
      .from(editionArticles)
      .innerJoin(articles, eq(articles.id, editionArticles.articleId))
      .where(eq(editionArticles.editionId, latestEdition.id))
      .orderBy(editionArticles.position)
      .limit(5);

    storyRows = ordered.map((r) => ({
      headline: r.headline,
      subheadline: r.subheadline,
      slug: r.slug,
      category: r.category,
      probability: r.probability,
    }));
  }

  if (storyRows.length === 0) {
    // Fallback: latest 5 articles overall
    const recent = await db
      .select({
        headline: articles.headline,
        subheadline: articles.subheadline,
        slug: articles.slug,
        category: articles.category,
        probability: articles.probabilityAtPublish,
      })
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(5);
    storyRows = recent;
  }

  if (storyRows.length === 0) {
    throw new Error("No articles available for digest");
  }

  const stories: DigestStory[] = storyRows.map((r) => ({
    headline: r.headline,
    dek: r.subheadline,
    slug: r.slug,
    category: r.category,
    probability: r.probability !== null ? Math.round(Number(r.probability)) : null,
  }));

  const [topStory, ...secondaryStories] = stories;

  // Today's challenge teaser (optional)
  let challenge: DigestChallenge | null = null;
  const isoDate = todayIso();
  const [challengeRow] = await db
    .select({ marketIds: dailyChallenges.marketIds })
    .from(dailyChallenges)
    .where(eq(dailyChallenges.date, isoDate))
    .limit(1);

  if (challengeRow) {
    // We need ONE evocative market title for the headline
    const [firstMarket] = await db
      .select({ title: markets.title })
      .from(markets)
      .where(sql`${markets.id} = ANY(${challengeRow.marketIds}::uuid[])`)
      .limit(1);

    challenge = {
      headline:
        firstMarket?.title ??
        "Today's prediction markets await your wager.",
      marketCount: challengeRow.marketIds.length,
      url: `${baseUrl.replace(/\/$/, "")}/challenge`,
    };
  }

  const volume = latestEdition?.volumeNumber ?? 1;
  // Edition number within the volume — derived best-effort. We use the count
  // of editions published today for a stable per-day index.
  const [{ count: editionCountToday } = { count: 0 }] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(editions)
    .where(sql`${editions.date} = CURRENT_DATE`);

  const editionNumber = Math.max(1, Number(editionCountToday) || 1);

  return {
    volume,
    editionNumber,
    dispatchDate: formatDispatchDate(),
    topStory,
    secondaryStories,
    challenge,
    baseUrl,
    // Replaced per-recipient at send time. Stays a real UUID-shape string so
    // preview rendering doesn't crash on link generation.
    unsubscribeToken: "00000000-0000-0000-0000-000000000000",
  };
}

// ── Subject line ─────────────────────────────────────────────────────────

/**
 * Subject line format — broadsheet voice, no emoji.
 *   "{topStoryHeadline OR challenge.headline} – Vol. {volume}"
 *
 * If a challenge exists we lead with it (per the spec: subject line is the
 * challenge headline + Vol. N). Otherwise fall back to the top story headline
 * so the email still reads like a newspaper masthead.
 */
export function buildSubjectLine(content: DigestContent): string {
  const lead = content.challenge?.headline ?? content.topStory.headline;
  // Trim to ~70 chars so the volume tag stays visible in inbox previews.
  const trimmed = lead.length > 70 ? `${lead.slice(0, 67)}...` : lead;
  return `${trimmed} – Vol. ${content.volume}`;
}

// ── Render HTML ──────────────────────────────────────────────────────────

export async function renderDigestHtml(
  content: DigestContent
): Promise<{ html: string; subject: string }> {
  const html = await render(DigestEmail(content));
  const subject = buildSubjectLine(content);
  return { html, subject };
}

// ── Send ─────────────────────────────────────────────────────────────────

export interface SendResult {
  status: "sent" | "skipped_no_provider" | "bounced" | "error";
  providerId?: string;
  error?: string;
}

/**
 * Send the digest to a single subscriber.
 * - Skips silently (returns "skipped_no_provider") if RESEND_API_KEY is unset.
 * - Marks subscriber as `bounced` on Resend 5xx / known bounce codes.
 * - Updates `last_sent_at` on success.
 */
export async function sendDigestToSubscriber(
  subscriberId: string,
  content: DigestContent
): Promise<SendResult> {
  // Load the subscriber for email + per-recipient unsubscribe token
  const [sub] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, subscriberId))
    .limit(1);

  if (!sub) return { status: "error", error: "subscriber not found" };
  if (sub.status !== "active") {
    return { status: "skipped_no_provider", error: `status=${sub.status}` };
  }

  const client = getResendClient();
  if (!client) {
    console.warn(
      "[email/send] RESEND_API_KEY not set — skipping send for subscriber %s",
      subscriberId
    );
    return { status: "skipped_no_provider" };
  }

  const personalised: DigestContent = {
    ...content,
    unsubscribeToken: sub.unsubscribeToken,
  };

  const { html, subject } = await renderDigestHtml(personalised);

  try {
    const res = await client.emails.send({
      from: FROM_ADDRESS,
      to: sub.email,
      subject,
      html,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      headers: {
        "List-Unsubscribe": `<${personalised.baseUrl.replace(/\/$/, "")}/unsubscribe?token=${sub.unsubscribeToken}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (res.error) {
      const code = (res.error as { name?: string; statusCode?: number }).statusCode ?? 0;
      const isBounce = code >= 500 || /bounce|invalid|undeliverable/i.test(res.error.message ?? "");
      if (isBounce) {
        await db
          .update(subscribers)
          .set({ status: "bounced" })
          .where(eq(subscribers.id, subscriberId));
        return { status: "bounced", error: res.error.message };
      }
      return { status: "error", error: res.error.message };
    }

    await db
      .update(subscribers)
      .set({ lastSentAt: new Date() })
      .where(eq(subscribers.id, subscriberId));

    return { status: "sent", providerId: res.data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email/send] failed", { subscriberId, error: message });
    return { status: "error", error: message };
  }
}

// ── Localized scheduling helper ──────────────────────────────────────────

/**
 * Returns the local hour-of-day (0-23) for the supplied IANA timezone.
 * Uses Intl.DateTimeFormat — no external timezone library needed.
 * Falls back to UTC if the timezone string is invalid.
 */
export function localHourFor(timezone: string, now: Date = new Date()): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    });
    const parts = fmt.formatToParts(now);
    const hourPart = parts.find((p) => p.type === "hour");
    if (!hourPart) return now.getUTCHours();
    const h = Number(hourPart.value);
    // Intl can return "24" at midnight in some node versions
    return h === 24 ? 0 : h;
  } catch {
    return now.getUTCHours();
  }
}

/** Find subscribers whose local hour right now matches their preferred send hour. */
export async function findSubscribersDueNow(
  now: Date = new Date()
): Promise<Subscriber[]> {
  const all = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.status, "active"));

  return all.filter((s) => {
    if (!s.timezone) return false;
    const h = localHourFor(s.timezone, now);
    return h === s.preferredSendHour;
  });
}

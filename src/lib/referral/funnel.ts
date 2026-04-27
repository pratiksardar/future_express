/**
 * Referral funnel server helpers.
 *
 * Pure server module — used by `/api/referrals/track`, `/api/subscribe`, and
 * the activation hook called from `sendDailyDigest`. We DO NOT expose this to
 * the client; everything is gated through HTTP or the digest pipeline.
 *
 * Stage transitions are forward-only:
 *   clicked → signed_up → activated
 *
 * Reward rule (per VIRAL_GROWTH_PLAN.md):
 *   when a referrer's `activated` count hits 3, every still-pending referral
 *   row for that referrer flips `reward_granted = true`. Pro-tier extension
 *   itself is stubbed — the Pro tier doesn't exist yet.
 */
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { referrals, subscribers } from "@/lib/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { isValidReferralCodeShape } from "./code";

// ── Constants ─────────────────────────────────────────────────────────────

export const REWARD_THRESHOLD = 3;

// IPs are hashed with sha256(ip + daily salt). The salt rotates daily so the
// same IP visiting on two different days produces two different hashes — that
// keeps the column useful for same-day click dedup but useless for long-term
// tracking. Privacy-by-default.
function dailySalt(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256")
    .update(`${ip}|${dailySalt()}`)
    .digest("hex")
    .slice(0, 32);
}

// ── Lookups ───────────────────────────────────────────────────────────────

export interface ReferrerLookup {
  id: string;
  email: string;
  referralCode: string;
}

/**
 * Look up the subscriber that owns the supplied referral code.
 * Returns null on shape failure or no-such-code. Case-sensitive match.
 */
export async function findReferrerByCode(
  code: unknown
): Promise<ReferrerLookup | null> {
  if (!isValidReferralCodeShape(code)) return null;
  const [row] = await db
    .select({
      id: subscribers.id,
      email: subscribers.email,
      referralCode: subscribers.referralCode,
    })
    .from(subscribers)
    .where(eq(subscribers.referralCode, code))
    .limit(1);
  if (!row || !row.referralCode) return null;
  return {
    id: row.id,
    email: row.email,
    referralCode: row.referralCode,
  };
}

// ── Click tracking ────────────────────────────────────────────────────────

export interface UtmTags {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
}

export interface RecordClickInput {
  referrerSubscriberId: string;
  clickSessionId: string;
  utm?: UtmTags;
  userAgent?: string | null;
  ipHash?: string | null;
}

export interface RecordClickResult {
  /** "created" if a new row was inserted, "deduped" if (referrer, session) already had a row. */
  outcome: "created" | "deduped";
  referralId: string;
}

/**
 * Record a click. Idempotent on `(referrerSubscriberId, clickSessionId)` —
 * uses the unique constraint to dedupe rather than a SELECT-then-INSERT race.
 */
export async function recordClick(
  input: RecordClickInput
): Promise<RecordClickResult> {
  const inserted = await db
    .insert(referrals)
    .values({
      referrerSubscriberId: input.referrerSubscriberId,
      clickSessionId: input.clickSessionId,
      stage: "clicked",
      utmSource: input.utm?.source ?? null,
      utmMedium: input.utm?.medium ?? null,
      utmCampaign: input.utm?.campaign ?? null,
      userAgent: input.userAgent ?? null,
      ipHash: input.ipHash ?? null,
    })
    .onConflictDoNothing({
      target: [referrals.referrerSubscriberId, referrals.clickSessionId],
    })
    .returning({ id: referrals.id });

  if (inserted.length > 0) {
    return { outcome: "created", referralId: inserted[0].id };
  }

  // Conflict — fetch the row that already existed.
  const [existing] = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerSubscriberId, input.referrerSubscriberId),
        eq(referrals.clickSessionId, input.clickSessionId)
      )
    )
    .limit(1);

  return {
    outcome: "deduped",
    referralId: existing?.id ?? "",
  };
}

// ── Signup attribution ────────────────────────────────────────────────────

export interface AttributeSignupInput {
  referrerSubscriberId: string;
  referredSubscriberId: string;
  referredEmail: string;
  clickSessionId: string | null;
  utm?: UtmTags;
  userAgent?: string | null;
  ipHash?: string | null;
}

/**
 * Mark a signup against an existing click row when one exists, or insert a
 * new `signed_up` row when the visitor entered the code directly without
 * having clicked the link. Returns the referral row id.
 *
 * If a click row exists (matched on referrer + clickSessionId), we promote
 * its stage to `signed_up` and fill the referred-subscriber fields.
 * If no click row is found, we insert a fresh row at `signed_up` stage.
 */
export async function attributeSignup(
  input: AttributeSignupInput
): Promise<{ referralId: string; promoted: boolean }> {
  // Step 1 — try to promote an existing click row.
  if (input.clickSessionId) {
    const promoted = await db
      .update(referrals)
      .set({
        referredSubscriberId: input.referredSubscriberId,
        referredEmail: input.referredEmail,
        stage: "signed_up",
        signedUpAt: new Date(),
      })
      .where(
        and(
          eq(referrals.referrerSubscriberId, input.referrerSubscriberId),
          eq(referrals.clickSessionId, input.clickSessionId),
          eq(referrals.stage, "clicked")
        )
      )
      .returning({ id: referrals.id });

    if (promoted.length > 0) {
      return { referralId: promoted[0].id, promoted: true };
    }
  }

  // Step 2 — direct-code entry path. Insert a new signed_up row.
  // We can't always use the unique constraint here (clickSessionId may be
  // null for direct entries), so we just insert.
  const [inserted] = await db
    .insert(referrals)
    .values({
      referrerSubscriberId: input.referrerSubscriberId,
      referredSubscriberId: input.referredSubscriberId,
      referredEmail: input.referredEmail,
      clickSessionId: input.clickSessionId,
      stage: "signed_up",
      signedUpAt: new Date(),
      utmSource: input.utm?.source ?? null,
      utmMedium: input.utm?.medium ?? null,
      utmCampaign: input.utm?.campaign ?? null,
      userAgent: input.userAgent ?? null,
      ipHash: input.ipHash ?? null,
    })
    .onConflictDoNothing({
      target: [referrals.referrerSubscriberId, referrals.clickSessionId],
    })
    .returning({ id: referrals.id });

  if (inserted) {
    return { referralId: inserted.id, promoted: false };
  }

  // Conflict path — already a row from this session. Update it forward.
  const [updated] = await db
    .update(referrals)
    .set({
      referredSubscriberId: input.referredSubscriberId,
      referredEmail: input.referredEmail,
      stage: "signed_up",
      signedUpAt: new Date(),
    })
    .where(
      and(
        eq(referrals.referrerSubscriberId, input.referrerSubscriberId),
        eq(referrals.clickSessionId, input.clickSessionId ?? "")
      )
    )
    .returning({ id: referrals.id });

  return {
    referralId: updated?.id ?? "",
    promoted: true,
  };
}

// ── Activation ────────────────────────────────────────────────────────────

export interface ActivationResult {
  /** Whether a referral row was found and promoted. */
  promotedReferral: boolean;
  /** Whether the subscriber's `activated_at` timestamp was set this call. */
  markedActivated: boolean;
  /** True if the referrer crossed the reward threshold on this call. */
  rewardEligible: boolean;
}

/**
 * Mark a subscriber as `activated` (first digest received).
 *
 * Side effects:
 *   1. Sets `subscribers.activated_at` if currently null. Idempotent.
 *   2. If a `signed_up` referral row points at this subscriber, promote it
 *      to `activated` and stamp `activated_at`.
 *   3. If the referrer's activated count just crossed `REWARD_THRESHOLD`,
 *      flip `reward_granted=true` on every still-pending referral row for
 *      that referrer (and log the eligibility — Pro tier doesn't exist yet
 *      so we don't actually upgrade anyone).
 *
 * Safe to call multiple times; only the first call performs writes.
 */
export async function markSubscriberActivated(
  subscriberId: string
): Promise<ActivationResult> {
  // Step 1 — flip the subscriber row.
  const flipped = await db
    .update(subscribers)
    .set({ activatedAt: new Date() })
    .where(
      and(eq(subscribers.id, subscriberId), isNull(subscribers.activatedAt))
    )
    .returning({ id: subscribers.id });

  const markedActivated = flipped.length > 0;

  // Step 2 — promote a matching signed_up referral row, if any.
  const promotedRows = await db
    .update(referrals)
    .set({
      stage: "activated",
      activatedAt: new Date(),
    })
    .where(
      and(
        eq(referrals.referredSubscriberId, subscriberId),
        eq(referrals.stage, "signed_up")
      )
    )
    .returning({
      id: referrals.id,
      referrerSubscriberId: referrals.referrerSubscriberId,
    });

  const promotedReferral = promotedRows.length > 0;
  let rewardEligible = false;

  // Step 3 — check the referrer's activated count and flag reward eligibility.
  if (promotedReferral) {
    const referrerId = promotedRows[0].referrerSubscriberId;
    const [{ activatedCount } = { activatedCount: 0 }] = await db
      .select({
        activatedCount: sql<number>`count(*)::int`,
      })
      .from(referrals)
      .where(
        and(
          eq(referrals.referrerSubscriberId, referrerId),
          eq(referrals.stage, "activated")
        )
      );

    if (Number(activatedCount) >= REWARD_THRESHOLD) {
      rewardEligible = true;
      const granted = await db
        .update(referrals)
        .set({ rewardGranted: true })
        .where(
          and(
            eq(referrals.referrerSubscriberId, referrerId),
            eq(referrals.rewardGranted, false)
          )
        )
        .returning({ id: referrals.id });

      if (granted.length > 0) {
        // TODO(pro-tier): grant Pro extension once Pro tier exists. For now
        // we only flip the boolean column so a future cron can pick it up.
        console.info(
          "[referral/funnel] reward eligible (Pro tier stub) — referrer=%s rows=%d",
          referrerId,
          granted.length
        );
      }
    }
  }

  return { promotedReferral, markedActivated, rewardEligible };
}

// ── Stats for the dashboard ───────────────────────────────────────────────

export interface ReferralStats {
  clicked: number;
  signedUp: number;
  activated: number;
  rewardEligible: boolean;
  rewardGranted: boolean;
}

export async function loadReferralStats(
  referrerSubscriberId: string
): Promise<ReferralStats> {
  // Count rows by stage. Stage values are already validated at the API edge,
  // and we count any reward_granted=true row to surface "claimed" state.
  const rows = await db
    .select({
      stage: referrals.stage,
      count: sql<number>`count(*)::int`,
      rewardGrantedAny: sql<boolean>`bool_or(${referrals.rewardGranted})`,
    })
    .from(referrals)
    .where(eq(referrals.referrerSubscriberId, referrerSubscriberId))
    .groupBy(referrals.stage);

  let clicked = 0;
  let signedUp = 0;
  let activated = 0;
  let rewardGranted = false;
  for (const r of rows) {
    const c = Number(r.count);
    if (r.stage === "clicked") clicked += c;
    else if (r.stage === "signed_up") signedUp += c;
    else if (r.stage === "activated") activated += c;
    if (r.rewardGrantedAny) rewardGranted = true;
  }

  // Funnel is cumulative for display: someone who signed_up was first counted
  // as clicked, but their row got promoted to signed_up and the click row was
  // the same row — so we don't double-count. clicked here = number still at
  // "clicked" stage. We want display totals (cumulative). Add forward.
  const cumulativeClicked = clicked + signedUp + activated;
  const cumulativeSignedUp = signedUp + activated;
  const cumulativeActivated = activated;

  return {
    clicked: cumulativeClicked,
    signedUp: cumulativeSignedUp,
    activated: cumulativeActivated,
    rewardEligible: cumulativeActivated >= REWARD_THRESHOLD,
    rewardGranted,
  };
}

export interface RecentReferralRow {
  stage: "clicked" | "signed_up" | "activated";
  signedUpAt: Date | null;
  activatedAt: Date | null;
  clickedAt: Date;
}

/** Most-recent referrals for the dashboard (no PII — no emails leak out). */
export async function loadRecentReferrals(
  referrerSubscriberId: string,
  limit = 10
): Promise<RecentReferralRow[]> {
  const rows = await db
    .select({
      stage: referrals.stage,
      signedUpAt: referrals.signedUpAt,
      activatedAt: referrals.activatedAt,
      clickedAt: referrals.clickedAt,
    })
    .from(referrals)
    .where(eq(referrals.referrerSubscriberId, referrerSubscriberId))
    .orderBy(sql`${referrals.clickedAt} DESC`)
    .limit(limit);

  return rows.map((r) => ({
    stage: (r.stage === "signed_up" || r.stage === "activated"
      ? r.stage
      : "clicked") as "clicked" | "signed_up" | "activated",
    signedUpAt: r.signedUpAt,
    activatedAt: r.activatedAt,
    clickedAt: r.clickedAt,
  }));
}

// ── Share URL builder ─────────────────────────────────────────────────────

export function buildShareUrl(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/$/, "")}/?ref=${encodeURIComponent(code)}`;
}

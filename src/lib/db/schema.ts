import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  integer,
  pgEnum,
  jsonb,
  date,
  unique,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const marketStatusEnum = pgEnum("market_status", [
  "active",
  "closed",
  "resolved",
]);
export const sourceEnum = pgEnum("source", ["polymarket", "kalshi"]);
export const editionTypeEnum = pgEnum("edition_type", [
  "morning",
  "evening",
  "breaking",
  "edition_4h",
]);
export const categoryEnum = pgEnum("category", [
  "politics",
  "economy",
  "crypto",
  "sports",
  "science",
  "entertainment",
  "world",
]);

export const markets = pgTable("markets", {
  id: uuid("id").primaryKey().defaultRandom(),
  polymarketId: varchar("polymarket_id", { length: 255 }),
  kalshiTicker: varchar("kalshi_ticker", { length: 255 }),
  title: varchar("title", { length: 1024 }).notNull(),
  description: text("description"),
  category: categoryEnum("category").notNull().default("politics"),
  currentProbability: decimal("current_probability", { precision: 5, scale: 2 }),
  polymarketProbability: decimal("polymarket_probability", {
    precision: 5,
    scale: 2,
  }),
  kalshiProbability: decimal("kalshi_probability", {
    precision: 5,
    scale: 2,
  }),
  volume24h: decimal("volume_24h", { precision: 20, scale: 2 }),
  status: marketStatusEnum("status").notNull().default("active"),
  resolutionOutcome: varchar("resolution_outcome", { length: 64 }),
  resolvedAt: timestamp("resolved_at"),
  polymarketSlug: varchar("polymarket_slug", { length: 512 }),
  kalshiEventTicker: varchar("kalshi_event_ticker", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("markets_polymarket_id_idx").on(t.polymarketId),
  index("markets_kalshi_ticker_idx").on(t.kalshiTicker),
  index("markets_status_idx").on(t.status),
  index("markets_category_idx").on(t.category),
]);

export const probabilitySnapshots = pgTable("probability_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id, { onDelete: "cascade" }),
  source: sourceEnum("source").notNull(),
  probability: decimal("probability", { precision: 5, scale: 2 }).notNull(),
  volume: decimal("volume", { precision: 20, scale: 2 }),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
}, (t) => [
  index("snapshots_market_id_idx").on(t.marketId),
  index("snapshots_recorded_at_idx").on(t.recordedAt),
  // Composite index for efficient "market probability over time" lookups
  index("snapshots_market_recorded_idx").on(t.marketId, t.recordedAt),
]);

export const articles = pgTable("articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id, { onDelete: "cascade" }),
  edition: editionTypeEnum("edition").notNull().default("morning"),
  headline: varchar("headline", { length: 512 }).notNull(),
  subheadline: varchar("subheadline", { length: 1024 }),
  body: text("body").notNull(),
  contrarianTake: text("contrarian_take"),
  category: categoryEnum("category").notNull(),
  slug: varchar("slug", { length: 512 }).notNull().unique(),
  imageUrl: text("image_url"),
  probabilityAtPublish: decimal("probability_at_publish", {
    precision: 5,
    scale: 2,
  }),
  sources: jsonb("sources"),
  llmModel: varchar("llm_model", { length: 64 }),
  version: integer("version").notNull().default(1),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("articles_market_id_idx").on(t.marketId),
  index("articles_edition_idx").on(t.edition),
  index("articles_category_idx").on(t.category),
  index("articles_published_at_idx").on(t.publishedAt),
]);

export const editions = pgTable("editions", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: editionTypeEnum("type").notNull(),
  date: date("date").notNull(),
  /** Sequential volume number for historical browsing (e.g. "Volume 12"). */
  volumeNumber: integer("volume_number"),
  editorPickArticleId: uuid("editor_pick_article_id").references(
    () => articles.id,
    { onDelete: "set null" }
  ),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  /**
   * Hedera Consensus Service transaction ID for the publish receipt, in
   * canonical form `0.0.PAYER@SECONDS.NANOS`. Null until the post-publish
   * Hedera log succeeds; null is also the steady-state when the Hedera
   * client is unconfigured (publish is the canonical action, Hedera is
   * the receipt — we never block publishing on a Hedera failure).
   */
  hederaTx: text("hedera_tx"),
  /** Wall-clock time the Hedera consensus message was submitted. */
  hederaPublishedAt: timestamp("hedera_published_at"),
}, (t) => [
  index("editions_date_idx").on(t.date),
  index("editions_volume_idx").on(t.volumeNumber),
  index("editions_hedera_published_at_idx").on(t.hederaPublishedAt),
]);

export const editionArticles = pgTable("edition_articles", {
  editionId: uuid("edition_id")
    .notNull()
    .references(() => editions.id, { onDelete: "cascade" }),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
}, (t) => [
  index("edition_articles_edition_id_idx").on(t.editionId),
  index("edition_articles_article_id_idx").on(t.articleId),
]);

/** Social playcards: one image per article per edition. Tied to same volume as newspaper. Admin-only via xyzzy. */
export const playcards = pgTable(
  "playcards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    /** Image stored in DB (data URI). Served via /api/playcards/[id]/image */
    imageUrl: text("image_url"),
    /** Legacy: path under public (optional when imageUrl is set) */
    filePath: varchar("file_path", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("playcards_edition_article").on(t.editionId, t.articleId)]
);

export const quicknodeStreams = pgTable("quicknode_streams", {
  id: uuid("id").primaryKey().defaultRandom(),
  streamId: varchar("stream_id", { length: 255 }),
  network: varchar("network", { length: 255 }),
  dataset: varchar("dataset", { length: 255 }),
  payload: jsonb("payload").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export const apiKeyTierEnum = pgEnum("api_key_tier", [
  "free",
  "developer",
  "business",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "api_key",
  "x402",
]);

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  keyHash: varchar("key_hash", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  tier: apiKeyTierEnum("tier").notNull().default("free"),
  ownerAddress: varchar("owner_address", { length: 42 }),
  callsToday: integer("calls_today").notNull().default(0),
  dailyLimit: integer("daily_limit").notNull().default(50),
  lastResetDate: date("last_reset_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
});

export const apiUsageLog = pgTable("api_usage_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id),
  endpoint: varchar("endpoint", { length: 255 }),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  txHash: varchar("tx_hash", { length: 66 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("api_usage_key_id_idx").on(t.apiKeyId),
  index("api_usage_created_at_idx").on(t.createdAt),
]);

// ── Accuracy Tracking ──

export const accuracyStatusEnum = pgEnum("accuracy_status", [
  "pending",
  "tracking",
  "resolved",
  "expired",
]);

export const marketAccuracy = pgTable("market_accuracy", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" })
    .unique(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id, { onDelete: "cascade" }),
  probabilityAtPublish: decimal("probability_at_publish", { precision: 5, scale: 2 }),
  currentProbability: decimal("current_probability", { precision: 5, scale: 2 }),
  probabilityDelta: decimal("probability_delta", { precision: 5, scale: 2 }),
  directionCorrect: integer("direction_correct"), // 1 = correct, 0 = wrong, null = unresolved
  brierScore: decimal("brier_score", { precision: 5, scale: 4 }),
  resolutionOutcome: varchar("resolution_outcome", { length: 64 }),
  status: accuracyStatusEnum("status").notNull().default("pending"),
  scoredAt: timestamp("scored_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("market_accuracy_article_idx").on(t.articleId),
  index("market_accuracy_market_idx").on(t.marketId),
  index("market_accuracy_status_idx").on(t.status),
]);

export const accuracyPeriodEnum = pgEnum("accuracy_period", [
  "daily",
  "weekly",
  "monthly",
  "all_time",
]);

export const platformAccuracy = pgTable("platform_accuracy", {
  id: uuid("id").primaryKey().defaultRandom(),
  period: accuracyPeriodEnum("period").notNull(),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  totalArticles: integer("total_articles").notNull().default(0),
  resolvedArticles: integer("resolved_articles").notNull().default(0),
  correctDirectionCount: integer("correct_direction_count").notNull().default(0),
  avgBrierScore: decimal("avg_brier_score", { precision: 5, scale: 4 }),
  confidenceScore: integer("confidence_score"), // 0-100
  categoryBreakdown: jsonb("category_breakdown"),
  topHits: jsonb("top_hits"),
  topMisses: jsonb("top_misses"),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (t) => [
  index("platform_accuracy_period_idx").on(t.period),
  index("platform_accuracy_computed_idx").on(t.computedAt),
]);

export const accuracyReports = pgTable("accuracy_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  platformAccuracyId: uuid("platform_accuracy_id")
    .references(() => platformAccuracy.id, { onDelete: "cascade" }),
  headline: varchar("headline", { length: 256 }).notNull(),
  narrative: text("narrative").notNull(),
  grade: varchar("grade", { length: 4 }).notNull(),
  lesson: text("lesson"),
  socialSummary: text("social_summary"),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("accuracy_reports_published_idx").on(t.publishedAt),
]);

// ── Daily Prediction Challenge ──

export const dailyChallenges = pgTable("daily_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  marketIds: text("market_ids").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPredictions = pgTable(
  "user_predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: text("session_id").notNull(),
    challengeDate: text("challenge_date").notNull(),
    marketId: text("market_id").notNull(),
    predictedProbability: integer("predicted_probability").notNull(), // 0-100
    actualProbability: integer("actual_probability"), // filled when resolved
    score: integer("score"), // 0-100
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  },
  (t) => [
    unique("user_predictions_session_date_market").on(
      t.sessionId,
      t.challengeDate,
      t.marketId
    ),
    index("user_predictions_session_date_idx").on(t.sessionId, t.challengeDate),
  ]
);

/**
 * Per-session streak aggregation for the Daily Prediction Challenge.
 *
 * A "play" advances the streak when the session submits at least one
 * prediction on a given UTC date. We aggregate here rather than re-walking
 * `user_predictions` on every read because the challenge surface is
 * latency-sensitive (LCP) and the table grows linearly with users * days.
 *
 * Identity is the localStorage `tfe_session_id` (no auth in v1). One row
 * per session.
 *
 * Rules implemented in `src/lib/challenge/streak.ts`:
 *  - same-day re-play is idempotent
 *  - exactly-+1-day gap → increment current
 *  - +2-day gap with `grace_used_at` older than 7 days → forgive once,
 *    increment, and stamp grace_used_at = today
 *  - any larger gap → reset to 1
 */
export const dailyChallengeStreaks = pgTable("daily_challenge_streaks", {
  sessionId: text("session_id").primaryKey(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  /** YYYY-MM-DD; null until the first play. */
  lastPlayedDate: text("last_played_date"),
  /** YYYY-MM-DD of the last forgiven gap; null when never used. */
  graceUsedAt: text("grace_used_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Ad-hoc Article-level Predictions (powers "I Called It" auto-share) ──

export const predictionDirectionEnum = pgEnum("prediction_direction", [
  "up",
  "down",
]);

/**
 * One row per (session, market) ad-hoc prediction made on an article page.
 * Distinct from `userPredictions` (daily-challenge slider) — this tracks
 * binary direction calls so we can light up the gold "CALLED IT" auto-share
 * when the user's call resolves correctly.
 */
export const predictions = pgTable(
  "predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: text("session_id").notNull(),
    marketId: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),
    articleId: uuid("article_id").references(() => articles.id, {
      onDelete: "set null",
    }),
    direction: predictionDirectionEnum("direction").notNull(),
    probabilityAtPrediction: decimal("probability_at_prediction", {
      precision: 5,
      scale: 2,
    }),
    predictedAt: timestamp("predicted_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    wasCorrect: boolean("was_correct"),
    iCalledItShared: boolean("i_called_it_shared").notNull().default(false),
  },
  (t) => [
    unique("predictions_session_market").on(t.sessionId, t.marketId),
    index("predictions_session_idx").on(t.sessionId),
    index("predictions_market_idx").on(t.marketId),
    index("predictions_resolved_at_idx").on(t.resolvedAt),
  ]
);

// ── Email Subscribers (Daily Digest) ──

export const subscribers = pgTable(
  "subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    /** active | unsubscribed | bounced */
    status: text("status").notNull().default("active"),
    /** Hour of the day (0-23) at which the subscriber wants their digest, in their local TZ. */
    preferredSendHour: integer("preferred_send_hour").notNull().default(7),
    /** IANA timezone string, e.g. "America/New_York". */
    timezone: text("timezone").notNull().default("UTC"),
    unsubscribeToken: uuid("unsubscribe_token").notNull().defaultRandom(),
    /**
     * 8-char alphanumeric (case-sensitive, friendly alphabet — no 0/O/1/I).
     * Generated at insert time. URL-safe. Unique across active subscribers.
     */
    referralCode: text("referral_code").unique(),
    /** The referral code used at signup, if any. */
    referredByCode: text("referred_by_code"),
    /**
     * Set the first time the subscriber receives a digest send (or completes
     * their first daily challenge after signup). Drives the "activated"
     * stage of the referral funnel.
     */
    activatedAt: timestamp("activated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastSentAt: timestamp("last_sent_at"),
  },
  (t) => [
    index("subscribers_status_idx").on(t.status),
    index("subscribers_unsubscribe_token_idx").on(t.unsubscribeToken),
    index("subscribers_send_hour_idx").on(t.preferredSendHour),
    index("subscribers_referral_code_idx").on(t.referralCode),
    index("subscribers_referred_by_code_idx").on(t.referredByCode),
  ]
);

// ── Newsletter Referrals (3-stage funnel) ──

/**
 * One row per referral interaction. Stages flow forward only:
 *   clicked → signed_up → activated
 *
 * - `clicked`  : someone hit `/?ref=<code>` with a previously-unseen session.
 * - `signed_up`: that visitor (or someone with the code in cookie) subscribed.
 *   `referredEmail` and `referredSubscriberId` are filled at this point.
 * - `activated`: the new subscriber received their first digest.
 *
 * `ipHash` is sha256(ip + daily salt) — never store raw IPs (privacy).
 *
 * Idempotency on click: `(referrerSubscriberId, clickSessionId)` is unique
 * so a single visitor can't double-count clicks.
 */
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerSubscriberId: uuid("referrer_subscriber_id")
      .notNull()
      .references(() => subscribers.id, { onDelete: "cascade" }),
    /** Filled when the referred party signs up. */
    referredEmail: text("referred_email"),
    referredSubscriberId: uuid("referred_subscriber_id").references(
      () => subscribers.id,
      { onDelete: "set null" }
    ),
    /** Visitor session id (from the `tfe_session_id` cookie/header). */
    clickSessionId: text("click_session_id"),
    /** "clicked" | "signed_up" | "activated" */
    stage: text("stage").notNull().default("clicked"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    clickedAt: timestamp("clicked_at").defaultNow().notNull(),
    signedUpAt: timestamp("signed_up_at"),
    activatedAt: timestamp("activated_at"),
    rewardGranted: boolean("reward_granted").notNull().default(false),
  },
  (t) => [
    index("referrals_referrer_idx").on(t.referrerSubscriberId),
    index("referrals_referred_subscriber_idx").on(t.referredSubscriberId),
    index("referrals_stage_idx").on(t.stage),
    unique("referrals_referrer_click_session").on(
      t.referrerSubscriberId,
      t.clickSessionId
    ),
  ]
);

// ── Web Push Notifications ──

/**
 * Browser PushSubscription rows. Created when a user opts in via the
 * `PushOptInPrompt` (homepage). Each row is one device/browser/permission.
 *
 * Indexed by:
 *  - sessionId — to look up all devices for a given session (used by
 *    `sendPredictionPush` so a single user with multiple devices receives
 *    the alert on each).
 *  - endpoint — push services dedupe by endpoint, so we make it unique to
 *    keep INSERT/UPDATE idempotent across re-subscribe events.
 *
 * `topics` is a small text array driving subscriber filtering for the three
 * fan-out events: 'breaking' (probability >10pt move), 'edition' (every 4h
 * publish), 'prediction' (a user's submitted prediction resolves).
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: text("session_id").notNull(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    /** Subscribed event topics. */
    topics: text("topics")
      .array()
      .notNull()
      .default(sql`ARRAY['breaking','edition','prediction']::text[]`),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  },
  (t) => [
    index("push_subscriptions_session_idx").on(t.sessionId),
    index("push_subscriptions_endpoint_idx").on(t.endpoint),
  ]
);

// ── Type exports ──

export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;
export type ProbabilitySnapshot = typeof probabilitySnapshots.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Edition = typeof editions.$inferSelect;
export type EditionArticle = typeof editionArticles.$inferSelect;
export type Playcard = typeof playcards.$inferSelect;
export type NewPlaycard = typeof playcards.$inferInsert;
export type QuicknodeStream = typeof quicknodeStreams.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type ApiUsageLogEntry = typeof apiUsageLog.$inferSelect;
export type MarketAccuracy = typeof marketAccuracy.$inferSelect;
export type PlatformAccuracy = typeof platformAccuracy.$inferSelect;
export type AccuracyReport = typeof accuracyReports.$inferSelect;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type UserPrediction = typeof userPredictions.$inferSelect;
export type NewUserPrediction = typeof userPredictions.$inferInsert;
export type DailyChallengeStreak = typeof dailyChallengeStreaks.$inferSelect;
export type NewDailyChallengeStreak = typeof dailyChallengeStreaks.$inferInsert;
export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;
export type Subscriber = typeof subscribers.$inferSelect;
export type NewSubscriber = typeof subscribers.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;

/** Referral funnel stages (forward-only). */
export type ReferralStage = "clicked" | "signed_up" | "activated";

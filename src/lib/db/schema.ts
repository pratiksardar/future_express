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
} from "drizzle-orm/pg-core";

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
});

export const probabilitySnapshots = pgTable("probability_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  marketId: uuid("market_id")
    .notNull()
    .references(() => markets.id, { onDelete: "cascade" }),
  source: sourceEnum("source").notNull(),
  probability: decimal("probability", { precision: 5, scale: 2 }).notNull(),
  volume: decimal("volume", { precision: 20, scale: 2 }),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

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
});

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
});

export const editionArticles = pgTable("edition_articles", {
  editionId: uuid("edition_id")
    .notNull()
    .references(() => editions.id, { onDelete: "cascade" }),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
});

export const quicknodeStreams = pgTable("quicknode_streams", {
  id: uuid("id").primaryKey().defaultRandom(),
  streamId: varchar("stream_id", { length: 255 }),
  network: varchar("network", { length: 255 }),
  dataset: varchar("dataset", { length: 255 }),
  payload: jsonb("payload").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;
export type ProbabilitySnapshot = typeof probabilitySnapshots.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Edition = typeof editions.$inferSelect;
export type EditionArticle = typeof editionArticles.$inferSelect;
export type QuicknodeStream = typeof quicknodeStreams.$inferSelect;

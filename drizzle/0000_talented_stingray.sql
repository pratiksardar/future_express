CREATE TYPE "public"."category" AS ENUM('politics', 'economy', 'crypto', 'sports', 'science', 'entertainment', 'world');--> statement-breakpoint
CREATE TYPE "public"."edition_type" AS ENUM('morning', 'evening', 'breaking', 'edition_4h');--> statement-breakpoint
CREATE TYPE "public"."market_status" AS ENUM('active', 'closed', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('polymarket', 'kalshi');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"edition" "edition_type" DEFAULT 'morning' NOT NULL,
	"headline" varchar(512) NOT NULL,
	"subheadline" varchar(1024),
	"body" text NOT NULL,
	"contrarian_take" text,
	"category" "category" NOT NULL,
	"slug" varchar(512) NOT NULL,
	"image_url" text,
	"probability_at_publish" numeric(5, 2),
	"sources" jsonb,
	"llm_model" varchar(64),
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "edition_articles" (
	"edition_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "edition_type" NOT NULL,
	"date" date NOT NULL,
	"volume_number" integer,
	"editor_pick_article_id" uuid,
	"published_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"polymarket_id" varchar(255),
	"kalshi_ticker" varchar(255),
	"title" varchar(1024) NOT NULL,
	"description" text,
	"category" "category" DEFAULT 'politics' NOT NULL,
	"current_probability" numeric(5, 2),
	"polymarket_probability" numeric(5, 2),
	"kalshi_probability" numeric(5, 2),
	"volume_24h" numeric(20, 2),
	"status" "market_status" DEFAULT 'active' NOT NULL,
	"resolution_outcome" varchar(64),
	"resolved_at" timestamp,
	"polymarket_slug" varchar(512),
	"kalshi_event_ticker" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "probability_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"source" "source" NOT NULL,
	"probability" numeric(5, 2) NOT NULL,
	"volume" numeric(20, 2),
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quicknode_streams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" varchar(255),
	"network" varchar(255),
	"dataset" varchar(255),
	"payload" jsonb NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_articles" ADD CONSTRAINT "edition_articles_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_articles" ADD CONSTRAINT "edition_articles_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_editor_pick_article_id_articles_id_fk" FOREIGN KEY ("editor_pick_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "probability_snapshots" ADD CONSTRAINT "probability_snapshots_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;
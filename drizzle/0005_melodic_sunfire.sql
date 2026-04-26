CREATE TYPE "public"."accuracy_period" AS ENUM('daily', 'weekly', 'monthly', 'all_time');--> statement-breakpoint
CREATE TYPE "public"."accuracy_status" AS ENUM('pending', 'tracking', 'resolved', 'expired');--> statement-breakpoint
CREATE TABLE "accuracy_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_accuracy_id" uuid,
	"headline" varchar(256) NOT NULL,
	"narrative" text NOT NULL,
	"grade" varchar(4) NOT NULL,
	"lesson" text,
	"social_summary" text,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_accuracy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"probability_at_publish" numeric(5, 2),
	"current_probability" numeric(5, 2),
	"probability_delta" numeric(5, 2),
	"direction_correct" integer,
	"brier_score" numeric(5, 4),
	"resolution_outcome" varchar(64),
	"status" "accuracy_status" DEFAULT 'pending' NOT NULL,
	"scored_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "market_accuracy_article_id_unique" UNIQUE("article_id")
);
--> statement-breakpoint
CREATE TABLE "platform_accuracy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" "accuracy_period" NOT NULL,
	"period_start" date,
	"period_end" date,
	"total_articles" integer DEFAULT 0 NOT NULL,
	"resolved_articles" integer DEFAULT 0 NOT NULL,
	"correct_direction_count" integer DEFAULT 0 NOT NULL,
	"avg_brier_score" numeric(5, 4),
	"confidence_score" integer,
	"category_breakdown" jsonb,
	"top_hits" jsonb,
	"top_misses" jsonb,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accuracy_reports" ADD CONSTRAINT "accuracy_reports_platform_accuracy_id_platform_accuracy_id_fk" FOREIGN KEY ("platform_accuracy_id") REFERENCES "public"."platform_accuracy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_accuracy" ADD CONSTRAINT "market_accuracy_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_accuracy" ADD CONSTRAINT "market_accuracy_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accuracy_reports_published_idx" ON "accuracy_reports" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "market_accuracy_article_idx" ON "market_accuracy" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "market_accuracy_market_idx" ON "market_accuracy" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "market_accuracy_status_idx" ON "market_accuracy" USING btree ("status");--> statement-breakpoint
CREATE INDEX "platform_accuracy_period_idx" ON "platform_accuracy" USING btree ("period");--> statement-breakpoint
CREATE INDEX "platform_accuracy_computed_idx" ON "platform_accuracy" USING btree ("computed_at");
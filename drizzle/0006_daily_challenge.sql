CREATE TABLE "daily_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"market_ids" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_challenges_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "user_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"challenge_date" text NOT NULL,
	"market_id" text NOT NULL,
	"predicted_probability" integer NOT NULL,
	"actual_probability" integer,
	"score" integer,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_predictions_session_date_market" UNIQUE("session_id","challenge_date","market_id")
);
--> statement-breakpoint
CREATE INDEX "user_predictions_session_date_idx" ON "user_predictions" USING btree ("session_id","challenge_date");
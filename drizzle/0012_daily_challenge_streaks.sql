CREATE TABLE "daily_challenge_streaks" (
	"session_id" text PRIMARY KEY NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_played_date" text,
	"grace_used_at" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

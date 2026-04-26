CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"preferred_send_hour" integer DEFAULT 7 NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"unsubscribe_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_sent_at" timestamp,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "subscribers_status_idx" ON "subscribers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscribers_unsubscribe_token_idx" ON "subscribers" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE INDEX "subscribers_send_hour_idx" ON "subscribers" USING btree ("preferred_send_hour");
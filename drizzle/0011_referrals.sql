CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_subscriber_id" uuid NOT NULL,
	"referred_email" text,
	"referred_subscriber_id" uuid,
	"click_session_id" text,
	"stage" text DEFAULT 'clicked' NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"user_agent" text,
	"ip_hash" text,
	"clicked_at" timestamp DEFAULT now() NOT NULL,
	"signed_up_at" timestamp,
	"activated_at" timestamp,
	"reward_granted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "referrals_referrer_click_session" UNIQUE("referrer_subscriber_id","click_session_id")
);
--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "referred_by_code" text;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "activated_at" timestamp;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_subscriber_id_subscribers_id_fk" FOREIGN KEY ("referrer_subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_subscriber_id_subscribers_id_fk" FOREIGN KEY ("referred_subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_subscriber_id");--> statement-breakpoint
CREATE INDEX "referrals_referred_subscriber_idx" ON "referrals" USING btree ("referred_subscriber_id");--> statement-breakpoint
CREATE INDEX "referrals_stage_idx" ON "referrals" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "subscribers_referral_code_idx" ON "subscribers" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "subscribers_referred_by_code_idx" ON "subscribers" USING btree ("referred_by_code");--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_referral_code_unique" UNIQUE("referral_code");
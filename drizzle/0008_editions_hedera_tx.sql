ALTER TABLE "editions" ADD COLUMN "hedera_tx" text;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "hedera_published_at" timestamp;--> statement-breakpoint
CREATE INDEX "editions_hedera_published_at_idx" ON "editions" USING btree ("hedera_published_at");

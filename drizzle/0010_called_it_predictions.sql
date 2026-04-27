CREATE TYPE "public"."prediction_direction" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"market_id" uuid NOT NULL,
	"article_id" uuid,
	"direction" "prediction_direction" NOT NULL,
	"probability_at_prediction" numeric(5, 2),
	"predicted_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"was_correct" boolean,
	"i_called_it_shared" boolean DEFAULT false NOT NULL,
	CONSTRAINT "predictions_session_market" UNIQUE("session_id","market_id")
);
--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "predictions_session_idx" ON "predictions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "predictions_market_idx" ON "predictions" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "predictions_resolved_at_idx" ON "predictions" USING btree ("resolved_at");
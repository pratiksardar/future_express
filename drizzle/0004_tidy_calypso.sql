CREATE INDEX "api_usage_key_id_idx" ON "api_usage_log" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_usage_created_at_idx" ON "api_usage_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "articles_market_id_idx" ON "articles" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "articles_edition_idx" ON "articles" USING btree ("edition");--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "edition_articles_edition_id_idx" ON "edition_articles" USING btree ("edition_id");--> statement-breakpoint
CREATE INDEX "edition_articles_article_id_idx" ON "edition_articles" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "editions_date_idx" ON "editions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "editions_volume_idx" ON "editions" USING btree ("volume_number");--> statement-breakpoint
CREATE INDEX "markets_polymarket_id_idx" ON "markets" USING btree ("polymarket_id");--> statement-breakpoint
CREATE INDEX "markets_kalshi_ticker_idx" ON "markets" USING btree ("kalshi_ticker");--> statement-breakpoint
CREATE INDEX "markets_status_idx" ON "markets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "markets_category_idx" ON "markets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "snapshots_market_id_idx" ON "probability_snapshots" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "snapshots_recorded_at_idx" ON "probability_snapshots" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "snapshots_market_recorded_idx" ON "probability_snapshots" USING btree ("market_id","recorded_at");
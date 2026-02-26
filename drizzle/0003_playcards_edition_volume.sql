-- Tie playcards to the same volume/edition as the newspaper
ALTER TABLE "playcards" ADD COLUMN "edition_id" uuid;
--> statement-breakpoint
UPDATE "playcards" SET "edition_id" = (SELECT "id" FROM "editions" ORDER BY "published_at" DESC LIMIT 1) WHERE "edition_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "playcards" ALTER COLUMN "edition_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "playcards" ADD CONSTRAINT "playcards_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playcards" DROP CONSTRAINT IF EXISTS "playcards_article_id_unique";
--> statement-breakpoint
ALTER TABLE "playcards" ADD CONSTRAINT "playcards_edition_article" UNIQUE("edition_id", "article_id");

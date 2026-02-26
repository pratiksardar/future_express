CREATE TABLE "playcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"file_path" varchar(512) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playcards_article_id_unique" UNIQUE("article_id")
);
--> statement-breakpoint
ALTER TABLE "playcards" ADD CONSTRAINT "playcards_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;

-- Store playcard image in DB (data URI), same pattern as articles.imageUrl
ALTER TABLE "playcards" ADD COLUMN IF NOT EXISTS "image_url" text;
ALTER TABLE "playcards" ALTER COLUMN "file_path" DROP NOT NULL;

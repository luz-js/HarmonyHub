DO $$
BEGIN
  ALTER TYPE "SongTrackType" ADD VALUE IF NOT EXISTS 'REFERENCE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "TrackProvider" AS ENUM ('UPLOAD', 'EXTERNAL_URL', 'LOCAL', 'S3', 'R2', 'SUPABASE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SongTrack"
  ADD COLUMN IF NOT EXISTS "uploadedById" TEXT,
  ADD COLUMN IF NOT EXISTS "mimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER,
  ADD COLUMN IF NOT EXISTS "originalFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SongTrack"
  ADD COLUMN IF NOT EXISTS "provider_next" "TrackProvider" NOT NULL DEFAULT 'UPLOAD';

UPDATE "SongTrack"
SET "provider_next" = CASE
  WHEN "provider" IN ('EXTERNAL_URL', 'LOCAL', 'S3', 'R2', 'SUPABASE', 'OTHER') THEN "provider"::"TrackProvider"
  WHEN "provider" = 'UPLOAD' THEN 'UPLOAD'::"TrackProvider"
  WHEN "url" IS NOT NULL AND "url" ~* '^https?://' THEN 'EXTERNAL_URL'::"TrackProvider"
  WHEN "storageKey" IS NOT NULL THEN 'LOCAL'::"TrackProvider"
  ELSE 'UPLOAD'::"TrackProvider"
END
WHERE "provider" IS NOT NULL;

ALTER TABLE "SongTrack"
  ALTER COLUMN "volumeDefault" SET DEFAULT 1,
  ALTER COLUMN "panDefault" SET DEFAULT 0;

UPDATE "SongTrack"
SET
  "volumeDefault" = COALESCE("volumeDefault", 1),
  "panDefault" = COALESCE("panDefault", 0),
  "active" = COALESCE("active", true);

ALTER TABLE "SongTrack"
  ALTER COLUMN "volumeDefault" SET NOT NULL,
  ALTER COLUMN "panDefault" SET NOT NULL;

ALTER TABLE "SongTrack"
  DROP COLUMN IF EXISTS "provider";

ALTER TABLE "SongTrack"
  RENAME COLUMN "provider_next" TO "provider";

DO $$
BEGIN
  ALTER TABLE "SongTrack"
    ADD CONSTRAINT "SongTrack_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "SongTrack_versionId_sortOrder_idx" ON "SongTrack"("versionId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SongTrack_songId_type_idx" ON "SongTrack"("songId", "type");
CREATE INDEX IF NOT EXISTS "SongTrack_songId_isPrimary_idx" ON "SongTrack"("songId", "isPrimary");

CREATE UNIQUE INDEX IF NOT EXISTS "SongTrack_song_primary_general_idx"
ON "SongTrack"("songId")
WHERE "versionId" IS NULL AND "isPrimary" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "SongTrack_song_primary_version_idx"
ON "SongTrack"("songId", "versionId")
WHERE "versionId" IS NOT NULL AND "isPrimary" = true;

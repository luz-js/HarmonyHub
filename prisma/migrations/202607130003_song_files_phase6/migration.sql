DO $$
BEGIN
  ALTER TYPE "SongFileCategory" ADD VALUE IF NOT EXISTS 'LEAD_SHEET';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SongFileCategory" ADD VALUE IF NOT EXISTS 'PIANO_SCORE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SongFileCategory" ADD VALUE IF NOT EXISTS 'GUITAR_SCORE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SongFileCategory" ADD VALUE IF NOT EXISTS 'BASS_SCORE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SongFileCategory" ADD VALUE IF NOT EXISTS 'DRUM_SCORE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SongFileCategory" ADD VALUE IF NOT EXISTS 'VOCAL_SCORE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SongFileCategory" ADD VALUE IF NOT EXISTS 'PRESENTATION';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SongFileCategory" ADD VALUE IF NOT EXISTS 'MIDI';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SongFileCategory" ADD VALUE IF NOT EXISTS 'MUSIC_XML';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "FileType" ADD VALUE IF NOT EXISTS 'IMAGE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "FileType" ADD VALUE IF NOT EXISTS 'OTHER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SongFile"
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "File"
  ADD COLUMN IF NOT EXISTS "originalName" TEXT,
  ADD COLUMN IF NOT EXISTS "checksum" TEXT;

-- Titulo de respaldo para filas existentes: usa el nombre del File asociado
-- (sin extension) cuando SongFile.title todavia es NULL.
UPDATE "SongFile" AS sf
SET "title" = regexp_replace(f."name", '\.[^.]+$', '')
FROM "File" AS f
WHERE sf."fileId" = f.id AND sf."title" IS NULL;

DROP INDEX IF EXISTS "SongFile_versionId_idx";

CREATE INDEX IF NOT EXISTS "SongFile_songId_sortOrder_idx" ON "SongFile"("songId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SongFile_versionId_sortOrder_idx" ON "SongFile"("versionId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SongFile_songId_isPrimary_idx" ON "SongFile"("songId", "isPrimary");

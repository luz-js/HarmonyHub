DO $$
BEGIN
  ALTER TYPE "SongLinkProvider" ADD VALUE IF NOT EXISTS 'BANDCAMP';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SongLinkProvider" ADD VALUE IF NOT EXISTS 'WEBSITE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SongLink"
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "embedUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  ALTER TABLE "SongLink"
    ADD CONSTRAINT "SongLink_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Asignar sortOrder consecutivo a los enlaces existentes (antes eran 0 para todos).
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "songId", COALESCE("versionId", '') ORDER BY "isPrimary" DESC, "createdAt" ASC) - 1 AS rn
  FROM "SongLink"
)
UPDATE "SongLink" AS link
SET "sortOrder" = ordered.rn
FROM ordered
WHERE link.id = ordered.id;

DROP INDEX IF EXISTS "SongLink_songId_provider_idx";

CREATE INDEX IF NOT EXISTS "SongLink_songId_sortOrder_idx" ON "SongLink"("songId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SongLink_versionId_sortOrder_idx" ON "SongLink"("versionId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SongLink_songId_provider_idx" ON "SongLink"("songId", "provider");
CREATE INDEX IF NOT EXISTS "SongLink_songId_isPrimary_idx" ON "SongLink"("songId", "isPrimary");

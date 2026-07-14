DO $$
BEGIN
  CREATE TYPE "SetlistStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SetlistItemType" AS ENUM ('SONG', 'SPEAKING', 'PRAYER', 'VIDEO', 'ANNOUNCEMENT', 'SILENCE', 'TRANSITION', 'BREAK', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Setlist"
  ADD COLUMN IF NOT EXISTS "status" "SetlistStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "itemCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isTemplate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

DO $$
BEGIN
  ALTER TABLE "Setlist"
    ADD CONSTRAINT "Setlist_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Setlist"
    ADD CONSTRAINT "Setlist_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Setlist_organizationId_status_idx" ON "Setlist"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Setlist_organizationId_updatedAt_idx" ON "Setlist"("organizationId", "updatedAt");

CREATE TABLE IF NOT EXISTS "SetlistItem" (
  "id" TEXT PRIMARY KEY,
  "setlistId" TEXT NOT NULL REFERENCES "Setlist"("id") ON DELETE CASCADE,
  "type" "SetlistItemType" NOT NULL DEFAULT 'SONG',
  "songId" TEXT REFERENCES "Song"("id") ON DELETE SET NULL,
  "songVersionId" TEXT REFERENCES "SongVersion"("id") ON DELETE RESTRICT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  "estimatedSec" INTEGER,
  "keyOverride" TEXT,
  "bpmOverride" INTEGER,
  "durationOverrideSec" INTEGER,
  "capo" INTEGER,
  "transitionNote" TEXT,
  "internalNote" TEXT,
  "includeClick" BOOLEAN NOT NULL DEFAULT false,
  "includePad" BOOLEAN NOT NULL DEFAULT false,
  "isOptional" BOOLEAN NOT NULL DEFAULT false,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "SetlistItem_setlistId_order_key" ON "SetlistItem"("setlistId", "order");
CREATE INDEX IF NOT EXISTS "SetlistItem_setlistId_type_idx" ON "SetlistItem"("setlistId", "type");
CREATE INDEX IF NOT EXISTS "SetlistItem_songId_idx" ON "SetlistItem"("songId");
CREATE INDEX IF NOT EXISTS "SetlistItem_songVersionId_idx" ON "SetlistItem"("songVersionId");

-- Backfill idempotente desde el modelo legacy "SetlistSong" (lista plana Setlist->Song).
-- Cada fila legacy se convierte en un SetlistItem tipo SONG, reordenado 0-based.
-- Si la fila legacy no tenia songVersionId explicito, se usa la version default de la
-- cancion (o la mas reciente si no hay default); si la cancion no tiene ninguna version,
-- la fila se omite y debe resolverse manualmente (no se asigna una version arbitraria).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SetlistSong') THEN
    INSERT INTO "SetlistItem" ("id", "setlistId", "type", "songId", "songVersionId", "title", "order", "keyOverride", "bpmOverride", "durationOverrideSec", "transitionNote", "internalNote", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid()::text,
      ss."setlistId",
      'SONG',
      ss."songId",
      COALESCE(ss."songVersionId", (
        SELECT sv."id" FROM "SongVersion" sv WHERE sv."songId" = ss."songId"
        ORDER BY sv."isDefault" DESC, sv."updatedAt" DESC LIMIT 1
      )),
      s."title",
      (ROW_NUMBER() OVER (PARTITION BY ss."setlistId" ORDER BY ss."order") - 1)::int,
      ss."keyOverride",
      ss."bpmOverride",
      ss."durationOverrideSec",
      ss."transitionNote",
      ss."notes",
      ss."createdAt",
      ss."updatedAt"
    FROM "SetlistSong" ss
    JOIN "Song" s ON s."id" = ss."songId"
    WHERE NOT EXISTS (SELECT 1 FROM "SetlistItem" si WHERE si."setlistId" = ss."setlistId" AND si."songId" = ss."songId")
      AND EXISTS (
        SELECT 1 FROM "SongVersion" sv WHERE sv."songId" = ss."songId"
        UNION SELECT 1 WHERE ss."songVersionId" IS NOT NULL
      );

    UPDATE "Setlist" st SET
      "itemCount" = sub.item_count,
      "estimatedSec" = sub.estimated_sec
    FROM (
      SELECT
        si."setlistId" AS id,
        COUNT(*)::int AS item_count,
        COALESCE(SUM(CASE WHEN si."isHidden" THEN 0 ELSE COALESCE(si."durationOverrideSec", si."estimatedSec", sv."durationSec", 0) END), 0)::int AS estimated_sec
      FROM "SetlistItem" si
      LEFT JOIN "SongVersion" sv ON sv."id" = si."songVersionId"
      GROUP BY si."setlistId"
    ) sub
    WHERE st."id" = sub.id;

    DROP TABLE "SetlistSong";
  END IF;
END $$;

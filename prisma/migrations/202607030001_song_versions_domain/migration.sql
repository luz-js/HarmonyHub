-- Sprint Canciones Fase 1: harden SongVersion as the musical core.
-- Safe/idempotent: no destructive changes and no legacy Song fields removed.

CREATE INDEX IF NOT EXISTS "SongVersion_songId_idx" ON "SongVersion"("songId");
CREATE INDEX IF NOT EXISTS "SongVersion_songId_isDefault_idx" ON "SongVersion"("songId", "isDefault");
CREATE INDEX IF NOT EXISTS "SongVersion_songId_name_idx" ON "SongVersion"("songId", "name");
CREATE INDEX IF NOT EXISTS "Song_organizationId_status_idx" ON "Song"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Song_organizationId_title_idx" ON "Song"("organizationId", "title");

INSERT INTO "SongVersion" (
  "id",
  "songId",
  "name",
  "key",
  "bpm",
  "durationSec",
  "lyrics",
  "chords",
  "contentJson",
  "notes",
  "isDefault",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('sv_', md5(random()::text || clock_timestamp()::text || "Song"."id")),
  "Song"."id",
  'Original',
  COALESCE("Song"."currentKey", "Song"."originalKey", 'C'),
  "Song"."bpm",
  "Song"."durationSec",
  "Song"."lyrics",
  "Song"."chords",
  jsonb_build_object(
    'sections',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'main-1',
        'type', 'SECTION',
        'name', 'Principal',
        'order', 1,
        'lines', jsonb_build_array(
          jsonb_build_object(
            'id', 'line-1',
            'chords', COALESCE("Song"."chords", ''),
            'lyrics', COALESCE("Song"."lyrics", '')
          )
        )
      )
    )
  ),
  "Song"."notes",
  true,
  now(),
  now()
FROM "Song"
WHERE NOT EXISTS (
  SELECT 1 FROM "SongVersion" WHERE "SongVersion"."songId" = "Song"."id"
);

WITH ranked_defaults AS (
  SELECT
    "id",
    row_number() OVER (PARTITION BY "songId" ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" ASC) AS rn
  FROM "SongVersion"
  WHERE "isDefault" = true
)
UPDATE "SongVersion"
SET "isDefault" = false
WHERE "id" IN (
  SELECT "id" FROM ranked_defaults WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "SongVersion_one_default_per_song_idx"
ON "SongVersion"("songId")
WHERE "isDefault" = true;

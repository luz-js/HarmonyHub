DO $$ BEGIN
  CREATE TYPE "SongTrackType" AS ENUM ('FULL_TRACK','BACKING_TRACK','CLICK','PAD','DRUMS','BASS','GUITAR','KEYS','VOCALS','CHOIR','GUIDE','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SongLinkProvider" AS ENUM ('YOUTUBE','SPOTIFY','APPLE_MUSIC','SOUNDCLOUD','VIMEO','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SongFileCategory" AS ENUM ('LYRIC_PDF','CHORD_CHART','SHEET_MUSIC','AUDIO','STEM','BACKING_TRACK','VIDEO','DOCUMENT','IMAGE','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SongNoteVisibility" AS ENUM ('PRIVATE','ORGANIZATION','LEADERS_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SongVersion" (
  "id" TEXT PRIMARY KEY,
  "songId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "bpm" INTEGER,
  "durationSec" INTEGER,
  "lyrics" TEXT,
  "chords" TEXT,
  "contentJson" JSONB,
  "structureJson" JSONB,
  "notes" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SongVersion_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "SongTrack"
  ADD COLUMN IF NOT EXISTS "versionId" TEXT,
  ADD COLUMN IF NOT EXISTS "type" "SongTrackType" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS "instrument" TEXT,
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "volumeDefault" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "panDefault" DOUBLE PRECISION;

DO $$ BEGIN
  ALTER TABLE "SongTrack" ADD CONSTRAINT "SongTrack_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "SongVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SongLink" (
  "id" TEXT PRIMARY KEY,
  "songId" TEXT NOT NULL,
  "versionId" TEXT,
  "provider" "SongLinkProvider" NOT NULL DEFAULT 'OTHER',
  "url" TEXT NOT NULL,
  "title" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SongLink_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SongLink_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SongVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SongFile" (
  "id" TEXT PRIMARY KEY,
  "songId" TEXT NOT NULL,
  "versionId" TEXT,
  "fileId" TEXT NOT NULL,
  "category" "SongFileCategory" NOT NULL DEFAULT 'OTHER',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SongFile_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SongFile_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SongVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SongFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SongNote" (
  "id" TEXT PRIMARY KEY,
  "songId" TEXT NOT NULL,
  "versionId" TEXT,
  "userId" TEXT,
  "organizationId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "visibility" "SongNoteVisibility" NOT NULL DEFAULT 'ORGANIZATION',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SongNote_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SongNote_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SongVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SongNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SongNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "SetlistSong"
  ADD COLUMN IF NOT EXISTS "songVersionId" TEXT,
  ADD COLUMN IF NOT EXISTS "bpmOverride" INTEGER,
  ADD COLUMN IF NOT EXISTS "transitionNote" TEXT,
  ADD COLUMN IF NOT EXISTS "durationOverrideSec" INTEGER;

DO $$ BEGIN
  ALTER TABLE "SetlistSong" ADD CONSTRAINT "SetlistSong_songVersionId_fkey"
    FOREIGN KEY ("songVersionId") REFERENCES "SongVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "SongVersion_songId_isDefault_idx" ON "SongVersion"("songId", "isDefault");
CREATE INDEX IF NOT EXISTS "SongVersion_songId_name_idx" ON "SongVersion"("songId", "name");
CREATE INDEX IF NOT EXISTS "SongTrack_versionId_idx" ON "SongTrack"("versionId");
CREATE INDEX IF NOT EXISTS "SongLink_songId_provider_idx" ON "SongLink"("songId", "provider");
CREATE INDEX IF NOT EXISTS "SongLink_versionId_idx" ON "SongLink"("versionId");
CREATE UNIQUE INDEX IF NOT EXISTS "SongFile_songId_fileId_key" ON "SongFile"("songId", "fileId");
CREATE INDEX IF NOT EXISTS "SongFile_songId_category_idx" ON "SongFile"("songId", "category");
CREATE INDEX IF NOT EXISTS "SongFile_versionId_idx" ON "SongFile"("versionId");
CREATE INDEX IF NOT EXISTS "SongFile_fileId_idx" ON "SongFile"("fileId");
CREATE INDEX IF NOT EXISTS "SongNote_songId_visibility_idx" ON "SongNote"("songId", "visibility");
CREATE INDEX IF NOT EXISTS "SongNote_versionId_idx" ON "SongNote"("versionId");
CREATE INDEX IF NOT EXISTS "SongNote_organizationId_idx" ON "SongNote"("organizationId");
CREATE INDEX IF NOT EXISTS "SongNote_userId_idx" ON "SongNote"("userId");
CREATE INDEX IF NOT EXISTS "SetlistSong_songVersionId_idx" ON "SetlistSong"("songVersionId");

INSERT INTO "SongVersion" (
  "id", "songId", "name", "key", "bpm", "durationSec", "lyrics", "chords",
  "contentJson", "notes", "isDefault", "createdAt", "updatedAt"
)
SELECT
  'version-default-' || "id",
  "id",
  'Version principal',
  COALESCE("currentKey", "originalKey", 'C'),
  "bpm",
  "durationSec",
  "lyrics",
  "chords",
  jsonb_build_object(
    'sections',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'Principal',
        'lines', jsonb_build_array(
          jsonb_build_object(
            'chords', COALESCE("chords", ''),
            'lyrics', COALESCE("lyrics", '')
          )
        )
      )
    )
  ),
  "notes",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Song"
WHERE NOT EXISTS (
  SELECT 1 FROM "SongVersion" WHERE "SongVersion"."songId" = "Song"."id" AND "SongVersion"."isDefault" = true
);

INSERT INTO "SongLink" ("id", "songId", "provider", "url", "title", "isPrimary", "createdAt", "updatedAt")
SELECT
  'link-youtube-' || "id",
  "id",
  'YOUTUBE',
  "youtubeUrl",
  'YouTube',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Song"
WHERE "youtubeUrl" IS NOT NULL AND "youtubeUrl" <> ''
ON CONFLICT ("id") DO UPDATE SET
  "url" = EXCLUDED."url",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SongFile" ("id", "songId", "fileId", "category", "sortOrder", "createdAt", "updatedAt")
SELECT
  'songfile-' || "id",
  "songId",
  "id",
  CASE
    WHEN "type" = 'PDF' THEN 'CHORD_CHART'::"SongFileCategory"
    WHEN "type" = 'SHEET_MUSIC' THEN 'SHEET_MUSIC'::"SongFileCategory"
    WHEN "type" = 'AUDIO' THEN 'AUDIO'::"SongFileCategory"
    WHEN "type" = 'BACKING_TRACK' THEN 'BACKING_TRACK'::"SongFileCategory"
    ELSE 'DOCUMENT'::"SongFileCategory"
  END,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "File"
WHERE "songId" IS NOT NULL
ON CONFLICT ("songId", "fileId") DO NOTHING;

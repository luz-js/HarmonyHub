DO $$
BEGIN
  CREATE TYPE "SongActivityType" AS ENUM (
    'SONG_CREATED', 'SONG_UPDATED', 'SONG_ARCHIVED', 'FAVORITE_CHANGED',
    'VERSION_CREATED', 'VERSION_UPDATED', 'VERSION_DELETED', 'VERSION_SET_DEFAULT', 'VERSION_TRANSPOSED', 'VERSION_RESTORED',
    'TRACK_ADDED', 'TRACK_UPDATED', 'TRACK_DELETED', 'TRACK_SET_PRIMARY',
    'LINK_ADDED', 'LINK_UPDATED', 'LINK_DELETED', 'LINK_SET_PRIMARY',
    'FILE_ADDED', 'FILE_UPDATED', 'FILE_DELETED', 'FILE_SET_PRIMARY',
    'NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_ARCHIVED', 'NOTE_DELETED', 'NOTE_PINNED',
    'THREAD_CREATED', 'THREAD_RESOLVED', 'THREAD_REOPENED', 'COMMENT_ADDED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SongEntityType" AS ENUM ('SONG', 'VERSION', 'TRACK', 'LINK', 'FILE', 'NOTE', 'THREAD', 'COMMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "RevisionSource" AS ENUM ('MANUAL_SAVE', 'TRANSPOSE', 'RESTORE', 'IMPORT', 'MIGRATION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SongActivity" (
  "id" TEXT PRIMARY KEY,
  "songId" TEXT NOT NULL REFERENCES "Song"("id") ON DELETE CASCADE,
  "versionId" TEXT REFERENCES "SongVersion"("id") ON DELETE SET NULL,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "actorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "action" "SongActivityType" NOT NULL,
  "entityType" "SongEntityType" NOT NULL,
  "entityId" TEXT,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SongActivity_songId_createdAt_idx" ON "SongActivity"("songId", "createdAt");
CREATE INDEX IF NOT EXISTS "SongActivity_versionId_createdAt_idx" ON "SongActivity"("versionId", "createdAt");
CREATE INDEX IF NOT EXISTS "SongActivity_organizationId_createdAt_idx" ON "SongActivity"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "SongActivity_actorId_createdAt_idx" ON "SongActivity"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "SongActivity_action_createdAt_idx" ON "SongActivity"("action", "createdAt");

CREATE TABLE IF NOT EXISTS "SongVersionRevision" (
  "id" TEXT PRIMARY KEY,
  "songId" TEXT NOT NULL REFERENCES "Song"("id") ON DELETE CASCADE,
  "versionId" TEXT NOT NULL REFERENCES "SongVersion"("id") ON DELETE CASCADE,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "revisionNumber" INTEGER NOT NULL,
  "reason" TEXT,
  "source" "RevisionSource" NOT NULL,
  "name" TEXT NOT NULL,
  "key" TEXT,
  "bpm" INTEGER,
  "durationSec" INTEGER,
  "contentJson" JSONB,
  "structureJson" JSONB,
  "lyrics" TEXT,
  "chords" TEXT,
  "notes" TEXT,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "SongVersionRevision_versionId_revisionNumber_key" ON "SongVersionRevision"("versionId", "revisionNumber");
CREATE INDEX IF NOT EXISTS "SongVersionRevision_songId_createdAt_idx" ON "SongVersionRevision"("songId", "createdAt");
CREATE INDEX IF NOT EXISTS "SongVersionRevision_versionId_revisionNumber_idx" ON "SongVersionRevision"("versionId", "revisionNumber");
CREATE INDEX IF NOT EXISTS "SongVersionRevision_versionId_contentHash_idx" ON "SongVersionRevision"("versionId", "contentHash");
CREATE INDEX IF NOT EXISTS "SongVersionRevision_organizationId_createdAt_idx" ON "SongVersionRevision"("organizationId", "createdAt");

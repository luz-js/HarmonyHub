DO $$
BEGIN
  CREATE TYPE "SongCommentTarget" AS ENUM ('SONG', 'VERSION', 'SECTION', 'TRACK', 'FILE', 'LINK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SongThreadStatus" AS ENUM ('OPEN', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SongNote"
  ADD COLUMN IF NOT EXISTS "authorId" TEXT,
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- Las notas legacy usaban "userId" (opcional); se copia a "authorId".
UPDATE "SongNote" SET "authorId" = "userId" WHERE "authorId" IS NULL AND "userId" IS NOT NULL;

-- Solo se aplica NOT NULL si no quedan notas sin autor conocido (evita romper
-- entornos con datos legacy incompletos; requeriria resolucion manual).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "SongNote" WHERE "authorId" IS NULL) THEN
    ALTER TABLE "SongNote" ALTER COLUMN "authorId" SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE "SongNote" DROP CONSTRAINT IF EXISTS "SongNote_userId_fkey";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE "SongNote" DROP COLUMN IF EXISTS "userId";

DO $$
BEGIN
  ALTER TABLE "SongNote"
    ADD CONSTRAINT "SongNote_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS "SongNote_songId_visibility_idx";
DROP INDEX IF EXISTS "SongNote_versionId_idx";
DROP INDEX IF EXISTS "SongNote_organizationId_idx";
DROP INDEX IF EXISTS "SongNote_userId_idx";

CREATE INDEX IF NOT EXISTS "SongNote_songId_createdAt_idx" ON "SongNote"("songId", "createdAt");
CREATE INDEX IF NOT EXISTS "SongNote_versionId_createdAt_idx" ON "SongNote"("versionId", "createdAt");
CREATE INDEX IF NOT EXISTS "SongNote_organizationId_visibility_idx" ON "SongNote"("organizationId", "visibility");
CREATE INDEX IF NOT EXISTS "SongNote_authorId_createdAt_idx" ON "SongNote"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "SongNote_songId_isPinned_idx" ON "SongNote"("songId", "isPinned");

CREATE TABLE IF NOT EXISTS "SongCommentThread" (
  "id" TEXT PRIMARY KEY,
  "songId" TEXT NOT NULL REFERENCES "Song"("id") ON DELETE CASCADE,
  "versionId" TEXT REFERENCES "SongVersion"("id") ON DELETE SET NULL,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "targetType" "SongCommentTarget" NOT NULL DEFAULT 'SONG',
  "targetRef" TEXT,
  "title" TEXT,
  "status" "SongThreadStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SongCommentThread_songId_status_createdAt_idx" ON "SongCommentThread"("songId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "SongCommentThread_versionId_status_idx" ON "SongCommentThread"("versionId", "status");
CREATE INDEX IF NOT EXISTS "SongCommentThread_organizationId_status_idx" ON "SongCommentThread"("organizationId", "status");

CREATE TABLE IF NOT EXISTS "SongComment" (
  "id" TEXT PRIMARY KEY,
  "threadId" TEXT NOT NULL REFERENCES "SongCommentThread"("id") ON DELETE CASCADE,
  "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "editedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SongComment_threadId_createdAt_idx" ON "SongComment"("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "SongComment_authorId_createdAt_idx" ON "SongComment"("authorId", "createdAt");

CREATE TABLE IF NOT EXISTS "SongCommentMention" (
  "id" TEXT PRIMARY KEY,
  "commentId" TEXT NOT NULL REFERENCES "SongComment"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "SongCommentMention_commentId_userId_key" ON "SongCommentMention"("commentId", "userId");
CREATE INDEX IF NOT EXISTS "SongCommentMention_userId_createdAt_idx" ON "SongCommentMention"("userId", "createdAt");

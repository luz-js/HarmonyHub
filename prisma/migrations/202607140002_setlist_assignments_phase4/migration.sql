DO $$
BEGIN
  CREATE TYPE "SetlistParticipantStatus" AS ENUM ('INVITED', 'CONFIRMED', 'DECLINED', 'TENTATIVE', 'NOT_REQUIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SetlistMusicalRole" AS ENUM (
    'MUSIC_DIRECTOR', 'BAND_LEADER', 'LEAD_VOCAL', 'BACKING_VOCAL', 'CHOIR',
    'ACOUSTIC_GUITAR', 'ELECTRIC_GUITAR', 'BASS', 'DRUMS', 'PERCUSSION', 'PIANO', 'KEYS', 'ORGAN', 'SYNTH', 'STRINGS', 'BRASS', 'WOODWIND', 'VIOLIN', 'CELLO',
    'TRACKS', 'CLICK', 'PAD',
    'AUDIO_ENGINEER', 'MONITOR_ENGINEER', 'LIGHTING', 'VIDEO',
    'SPEAKER', 'PRAYER_LEADER', 'ANNOUNCER',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AssignmentPreparationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'NEEDS_REVIEW', 'BLOCKED', 'NOT_APPLICABLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SetlistParticipant" (
  "id" TEXT PRIMARY KEY,
  "setlistId" TEXT NOT NULL REFERENCES "Setlist"("id") ON DELETE CASCADE,
  "membershipId" TEXT NOT NULL REFERENCES "Membership"("id") ON DELETE CASCADE,
  "status" "SetlistParticipantStatus" NOT NULL DEFAULT 'INVITED',
  "generalRole" TEXT,
  "generalNote" TEXT,
  "addedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "SetlistParticipant_setlistId_membershipId_key" ON "SetlistParticipant"("setlistId", "membershipId");
CREATE INDEX IF NOT EXISTS "SetlistParticipant_setlistId_status_idx" ON "SetlistParticipant"("setlistId", "status");
CREATE INDEX IF NOT EXISTS "SetlistParticipant_membershipId_idx" ON "SetlistParticipant"("membershipId");

CREATE TABLE IF NOT EXISTS "SetlistAssignment" (
  "id" TEXT PRIMARY KEY,
  "setlistItemId" TEXT NOT NULL REFERENCES "SetlistItem"("id") ON DELETE CASCADE,
  "participantId" TEXT NOT NULL REFERENCES "SetlistParticipant"("id") ON DELETE CASCADE,
  "role" "SetlistMusicalRole" NOT NULL,
  "instrument" TEXT,
  "label" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "preparationStatus" "AssignmentPreparationStatus" NOT NULL DEFAULT 'PENDING',
  "preparationNote" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "SetlistAssignment_setlistItemId_participantId_role_key" ON "SetlistAssignment"("setlistItemId", "participantId", "role");
CREATE INDEX IF NOT EXISTS "SetlistAssignment_setlistItemId_role_idx" ON "SetlistAssignment"("setlistItemId", "role");
CREATE INDEX IF NOT EXISTS "SetlistAssignment_participantId_idx" ON "SetlistAssignment"("participantId");
CREATE INDEX IF NOT EXISTS "SetlistAssignment_setlistItemId_preparationStatus_idx" ON "SetlistAssignment"("setlistItemId", "preparationStatus");

CREATE TABLE IF NOT EXISTS "SetlistRoleRequirement" (
  "id" TEXT PRIMARY KEY,
  "setlistItemId" TEXT NOT NULL REFERENCES "SetlistItem"("id") ON DELETE CASCADE,
  "role" "SetlistMusicalRole" NOT NULL,
  "label" TEXT,
  "minimumCount" INTEGER NOT NULL DEFAULT 1,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "SetlistRoleRequirement_setlistItemId_role_key" ON "SetlistRoleRequirement"("setlistItemId", "role");
CREATE INDEX IF NOT EXISTS "SetlistRoleRequirement_setlistItemId_isRequired_idx" ON "SetlistRoleRequirement"("setlistItemId", "isRequired");

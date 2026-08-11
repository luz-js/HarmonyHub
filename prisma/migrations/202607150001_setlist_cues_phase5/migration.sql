DO $$
BEGIN
  CREATE TYPE "SetlistCueType" AS ENUM (
    'COUNT_IN', 'CLICK_START', 'CLICK_STOP', 'PAD_START', 'PAD_STOP', 'TRACK_START', 'TRACK_STOP',
    'MUSIC_ENTRY', 'MUSIC_STOP', 'DYNAMICS_UP', 'DYNAMICS_DOWN', 'REPEAT_SECTION', 'SKIP_SECTION', 'MODULATION', 'TEMPO_CHANGE', 'FREE_TIME', 'HOLD', 'ENDING',
    'SPEAKING', 'PRAYER', 'ANNOUNCEMENT', 'SILENCE',
    'VIDEO_START', 'VIDEO_STOP', 'SLIDE_CHANGE', 'LYRICS_ON', 'LYRICS_OFF',
    'LIGHTS_SCENE', 'LIGHTS_BLACKOUT', 'LIGHTS_FADE',
    'AUDIO_MUTE', 'AUDIO_UNMUTE', 'AUDIO_LEVEL', 'MONITOR_CHANGE',
    'INSTRUMENT_CHANGE', 'CAPO_CHANGE', 'PATCH_CHANGE', 'TUNING_CHANGE',
    'ENTER_STAGE', 'EXIT_STAGE', 'POSITION_CHANGE',
    'TIMER', 'MARKER', 'CUSTOM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SetlistCuePhase" AS ENUM ('BEFORE', 'DURING', 'AFTER', 'GLOBAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SetlistCueStatus" AS ENUM ('PENDING', 'READY', 'NEEDS_REVIEW', 'BLOCKED', 'COMPLETED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SetlistCuePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SetlistCue" (
  "id" TEXT PRIMARY KEY,
  "setlistId" TEXT NOT NULL REFERENCES "Setlist"("id") ON DELETE CASCADE,
  "setlistItemId" TEXT REFERENCES "SetlistItem"("id") ON DELETE CASCADE,
  "type" "SetlistCueType" NOT NULL,
  "phase" "SetlistCuePhase" NOT NULL DEFAULT 'BEFORE',
  "status" "SetlistCueStatus" NOT NULL DEFAULT 'PENDING',
  "priority" "SetlistCuePriority" NOT NULL DEFAULT 'NORMAL',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "offsetSec" INTEGER,
  "durationSec" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "isOptional" BOOLEAN NOT NULL DEFAULT false,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "responsibleParticipantId" TEXT REFERENCES "SetlistParticipant"("id") ON DELETE SET NULL,
  "responsibleAssignmentId" TEXT REFERENCES "SetlistAssignment"("id") ON DELETE SET NULL,
  "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "completedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SetlistCue_setlistId_sortOrder_idx" ON "SetlistCue"("setlistId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SetlistCue_setlistItemId_phase_sortOrder_idx" ON "SetlistCue"("setlistItemId", "phase", "sortOrder");
CREATE INDEX IF NOT EXISTS "SetlistCue_setlistId_type_idx" ON "SetlistCue"("setlistId", "type");
CREATE INDEX IF NOT EXISTS "SetlistCue_setlistId_status_idx" ON "SetlistCue"("setlistId", "status");
CREATE INDEX IF NOT EXISTS "SetlistCue_responsibleParticipantId_idx" ON "SetlistCue"("responsibleParticipantId");
CREATE INDEX IF NOT EXISTS "SetlistCue_responsibleAssignmentId_idx" ON "SetlistCue"("responsibleAssignmentId");

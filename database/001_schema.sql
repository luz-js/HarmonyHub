-- HarmonyHub schema
-- PostgreSQL DDL script. Run this before 002_seed.sql.

BEGIN;

CREATE SCHEMA IF NOT EXISTS public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrganizationType') THEN
    CREATE TYPE "OrganizationType" AS ENUM ('BAND', 'MINISTRY', 'ACOUSTIC_GROUP', 'ORCHESTRA', 'OTHER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipRole') THEN
    CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'LEADER', 'MUSICIAN', 'GUEST');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipStatus') THEN
    CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'INVITED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvitationStatus') THEN
    CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SongStatus') THEN
    CREATE TYPE "SongStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventStatus') THEN
    CREATE TYPE "EventStatus" AS ENUM ('CONFIRMED', 'PENDING', 'DRAFT', 'CANCELLED', 'FINISHED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus') THEN
    CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FileType') THEN
    CREATE TYPE "FileType" AS ENUM ('PDF', 'LYRICS', 'SHEET_MUSIC', 'AUDIO', 'VIDEO', 'BACKING_TRACK', 'DOCUMENT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "phone" TEXT,
  "avatarUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "OrganizationType" NOT NULL DEFAULT 'BAND',
  "description" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#18e0ae',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Membership" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "role" "MembershipRole" NOT NULL DEFAULT 'MUSICIAN',
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "instrument" TEXT,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Invitation" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "email" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'MUSICIAN',
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "token" TEXT NOT NULL,
  "invitedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Song" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "title" TEXT NOT NULL,
  "artist" TEXT NOT NULL,
  "originalKey" TEXT NOT NULL,
  "currentKey" TEXT NOT NULL,
  "bpm" INTEGER,
  "durationSec" INTEGER,
  "lyrics" TEXT,
  "chords" TEXT,
  "notes" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" "SongStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Setlist" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "estimatedSec" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SetlistSong" (
  "id" TEXT PRIMARY KEY,
  "setlistId" TEXT NOT NULL REFERENCES "Setlist"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "songId" TEXT NOT NULL REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "order" INTEGER NOT NULL,
  "keyOverride" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "setlistId" TEXT REFERENCES "Setlist"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "location" TEXT,
  "description" TEXT,
  "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EventMusician" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "membershipId" TEXT NOT NULL REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "instrument" TEXT,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "File" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "uploadedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "songId" TEXT REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "eventId" TEXT REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "setlistId" TEXT REFERENCES "Setlist"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "type" "FileType" NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "storageKey" TEXT,
  "url" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_slug_idx" ON "Organization"("slug");

CREATE INDEX IF NOT EXISTS "Membership_organizationId_role_idx" ON "Membership"("organizationId", "role");
CREATE INDEX IF NOT EXISTS "Membership_userId_idx" ON "Membership"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX IF NOT EXISTS "Invitation_email_idx" ON "Invitation"("email");
CREATE INDEX IF NOT EXISTS "Invitation_organizationId_idx" ON "Invitation"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "Invitation_organizationId_email_status_key" ON "Invitation"("organizationId", "email", "status");

CREATE INDEX IF NOT EXISTS "Song_organizationId_status_idx" ON "Song"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Song_organizationId_title_idx" ON "Song"("organizationId", "title");

CREATE INDEX IF NOT EXISTS "Setlist_organizationId_name_idx" ON "Setlist"("organizationId", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "SetlistSong_setlistId_songId_key" ON "SetlistSong"("setlistId", "songId");
CREATE UNIQUE INDEX IF NOT EXISTS "SetlistSong_setlistId_order_key" ON "SetlistSong"("setlistId", "order");
CREATE INDEX IF NOT EXISTS "SetlistSong_songId_idx" ON "SetlistSong"("songId");

CREATE INDEX IF NOT EXISTS "Event_organizationId_startsAt_idx" ON "Event"("organizationId", "startsAt");
CREATE INDEX IF NOT EXISTS "Event_organizationId_status_idx" ON "Event"("organizationId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "EventMusician_eventId_membershipId_key" ON "EventMusician"("eventId", "membershipId");
CREATE INDEX IF NOT EXISTS "EventMusician_membershipId_idx" ON "EventMusician"("membershipId");

CREATE INDEX IF NOT EXISTS "File_organizationId_type_idx" ON "File"("organizationId", "type");
CREATE INDEX IF NOT EXISTS "File_songId_idx" ON "File"("songId");
CREATE INDEX IF NOT EXISTS "File_eventId_idx" ON "File"("eventId");
CREATE INDEX IF NOT EXISTS "File_setlistId_idx" ON "File"("setlistId");

COMMIT;

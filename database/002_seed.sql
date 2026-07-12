-- HarmonyHub seed data
-- PostgreSQL DML script. Run this after 001_schema.sql.

BEGIN;

INSERT INTO "User" ("id", "name", "email", "passwordHash", "phone", "active", "createdAt", "updatedAt")
VALUES
  ('user-juan-perez', 'Juan Pérez', 'juan@email.com', 'dev_password_password123', '+52 123 456 7890', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user-maria-gonzalez', 'María González', 'maria@ejemplo.com', 'dev_password_musica123', '+52 123 456 7891', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user-carlos-rodriguez', 'Carlos Rodríguez', 'carlos@ejemplo.com', 'dev_password_musica123', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user-ana-martinez', 'Ana Martínez', 'ana@ejemplo.com', 'dev_password_musica123', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "email" = EXCLUDED."email",
  "passwordHash" = EXCLUDED."passwordHash",
  "phone" = EXCLUDED."phone",
  "active" = EXCLUDED."active",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Organization" ("id", "slug", "name", "type", "description", "primaryColor", "createdAt", "updatedAt")
VALUES
  ('org-banda-renacer', 'banda-renacer', 'Banda Renacer', 'BAND', 'Grupo de alabanza enfocado en llevar esperanza a través de la música.', '#18e0ae', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('org-ministerio-central', 'ministerio-central', 'Ministerio Central', 'MINISTRY', NULL, '#18e0ae', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('org-grupo-acustico', 'grupo-acustico', 'Grupo Acústico', 'ACOUSTIC_GROUP', NULL, '#18e0ae', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('org-orquesta-juvenil', 'orquesta-juvenil', 'Orquesta Juvenil', 'ORCHESTRA', NULL, '#18e0ae', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "slug" = EXCLUDED."slug",
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "description" = EXCLUDED."description",
  "primaryColor" = EXCLUDED."primaryColor",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Membership" ("id", "userId", "organizationId", "role", "status", "instrument", "joinedAt")
VALUES
  ('membership-juan-banda', 'user-juan-perez', 'org-banda-renacer', 'OWNER', 'ACTIVE', 'Dirección', CURRENT_TIMESTAMP),
  ('membership-maria-banda', 'user-maria-gonzalez', 'org-banda-renacer', 'LEADER', 'ACTIVE', 'Voz', CURRENT_TIMESTAMP),
  ('membership-carlos-banda', 'user-carlos-rodriguez', 'org-banda-renacer', 'MUSICIAN', 'ACTIVE', 'Guitarra', CURRENT_TIMESTAMP),
  ('membership-ana-banda', 'user-ana-martinez', 'org-banda-renacer', 'MUSICIAN', 'ACTIVE', 'Teclado', CURRENT_TIMESTAMP),
  ('membership-juan-ministerio', 'user-juan-perez', 'org-ministerio-central', 'ADMIN', 'ACTIVE', NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "userId" = EXCLUDED."userId",
  "organizationId" = EXCLUDED."organizationId",
  "role" = EXCLUDED."role",
  "status" = EXCLUDED."status",
  "instrument" = EXCLUDED."instrument";

INSERT INTO "Song" (
  "id",
  "organizationId",
  "title",
  "artist",
  "originalKey",
  "currentKey",
  "bpm",
  "durationSec",
  "lyrics",
  "chords",
  "notes",
  "tags",
  "status",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    'song-gratitud',
    'org-banda-renacer',
    'Gratitud',
    'Miel San Marcos',
    'D',
    'D',
    72,
    275,
    $lyrics$VERSO 1
Qué daría de mí
Si no te hubiera encontrado
Qué sería de mí
Si tus ojos no me miraran
Qué sería de mí
Si tu gracia no me alcanzara

CORO
Te daré mi gratitud
Con todo lo que soy
Te adoraré por siempre
Por todo lo que has hecho en mí$lyrics$,
    NULL,
    NULL,
    ARRAY['Alabanza', 'Suave', 'Contemporánea'],
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  ('song-como-en-el-cielo', 'org-banda-renacer', 'Como en el Cielo', 'Elevation Worship', 'C', 'C', 68, 392, NULL, NULL, NULL, ARRAY['Adoración', 'Congregacional'], 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('song-agradecido', 'org-banda-renacer', 'Agradecido', 'Aarón Rojas', 'G', 'G', 70, 310, NULL, NULL, NULL, ARRAY['Alabanza'], 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('song-digno-de-alabar', 'org-banda-renacer', 'Digno de Alabar', 'Marcos Brunet', 'A', 'A', 65, 375, NULL, NULL, NULL, ARRAY['Adoración'], 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('song-eres-fiel', 'org-banda-renacer', 'Eres Fiel', 'Christine D''Clario', 'E', 'E', 78, 260, NULL, NULL, NULL, ARRAY['Alabanza'], 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "organizationId" = EXCLUDED."organizationId",
  "title" = EXCLUDED."title",
  "artist" = EXCLUDED."artist",
  "originalKey" = EXCLUDED."originalKey",
  "currentKey" = EXCLUDED."currentKey",
  "bpm" = EXCLUDED."bpm",
  "durationSec" = EXCLUDED."durationSec",
  "lyrics" = EXCLUDED."lyrics",
  "chords" = EXCLUDED."chords",
  "notes" = EXCLUDED."notes",
  "tags" = EXCLUDED."tags",
  "status" = EXCLUDED."status",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Setlist" ("id", "organizationId", "name", "description", "estimatedSec", "createdAt", "updatedAt")
VALUES
  ('setlist-culto-19-mayo', 'org-banda-renacer', 'Culto 19 Mayo 2024', 'Setlist para el culto dominical.', 1612, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "organizationId" = EXCLUDED."organizationId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "estimatedSec" = EXCLUDED."estimatedSec",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SetlistSong" ("id", "setlistId", "songId", "order", "keyOverride", "notes", "createdAt", "updatedAt")
VALUES
  ('setlist-song-1', 'setlist-culto-19-mayo', 'song-gratitud', 1, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('setlist-song-2', 'setlist-culto-19-mayo', 'song-como-en-el-cielo', 2, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('setlist-song-3', 'setlist-culto-19-mayo', 'song-agradecido', 3, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('setlist-song-4', 'setlist-culto-19-mayo', 'song-digno-de-alabar', 4, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('setlist-song-5', 'setlist-culto-19-mayo', 'song-eres-fiel', 5, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "setlistId" = EXCLUDED."setlistId",
  "songId" = EXCLUDED."songId",
  "order" = EXCLUDED."order",
  "keyOverride" = EXCLUDED."keyOverride",
  "notes" = EXCLUDED."notes",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Event" ("id", "organizationId", "setlistId", "name", "startsAt", "endsAt", "location", "description", "status", "createdAt", "updatedAt")
VALUES
  ('event-ensayo-general', 'org-banda-renacer', 'setlist-culto-19-mayo', 'Ensayo General', TIMESTAMP '2026-06-24 19:00:00', TIMESTAMP '2026-06-24 21:00:00', 'Sala de Ensayos', NULL, 'CONFIRMED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('event-culto-dominical', 'org-banda-renacer', 'setlist-culto-19-mayo', 'Culto Dominical', TIMESTAMP '2026-06-28 09:00:00', NULL, 'Iglesia Central', NULL, 'CONFIRMED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('event-concierto-jovenes', 'org-banda-renacer', NULL, 'Concierto Jóvenes', TIMESTAMP '2026-07-03 19:30:00', NULL, 'Auditorio Principal', NULL, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "organizationId" = EXCLUDED."organizationId",
  "setlistId" = EXCLUDED."setlistId",
  "name" = EXCLUDED."name",
  "startsAt" = EXCLUDED."startsAt",
  "endsAt" = EXCLUDED."endsAt",
  "location" = EXCLUDED."location",
  "description" = EXCLUDED."description",
  "status" = EXCLUDED."status",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "EventMusician" ("id", "eventId", "membershipId", "instrument", "status", "note", "createdAt", "updatedAt")
VALUES
  ('event-musician-1', 'event-ensayo-general', 'membership-maria-banda', 'Voz', 'CONFIRMED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('event-musician-2', 'event-ensayo-general', 'membership-carlos-banda', 'Guitarra', 'CONFIRMED', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('event-musician-3', 'event-ensayo-general', 'membership-ana-banda', 'Teclado', 'PENDING', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "eventId" = EXCLUDED."eventId",
  "membershipId" = EXCLUDED."membershipId",
  "instrument" = EXCLUDED."instrument",
  "status" = EXCLUDED."status",
  "note" = EXCLUDED."note",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Invitation" ("id", "organizationId", "email", "role", "status", "token", "invitedById", "expiresAt", "acceptedAt", "createdAt", "updatedAt")
VALUES
  ('invite-julian', 'org-banda-renacer', 'julian@ejemplo.com', 'MUSICIAN', 'PENDING', 'dev-token-julian', 'user-juan-perez', TIMESTAMP '2026-06-24 23:59:59', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('invite-eva', 'org-banda-renacer', 'eva@ejemplo.com', 'LEADER', 'PENDING', 'dev-token-eva', 'user-juan-perez', TIMESTAMP '2026-06-21 23:59:59', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "organizationId" = EXCLUDED."organizationId",
  "email" = EXCLUDED."email",
  "role" = EXCLUDED."role",
  "status" = EXCLUDED."status",
  "token" = EXCLUDED."token",
  "invitedById" = EXCLUDED."invitedById",
  "expiresAt" = EXCLUDED."expiresAt",
  "acceptedAt" = EXCLUDED."acceptedAt",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "File" ("id", "organizationId", "uploadedById", "songId", "eventId", "setlistId", "name", "type", "mimeType", "sizeBytes", "storageKey", "url", "createdAt", "updatedAt")
VALUES
  ('file-gratitud-letra', 'org-banda-renacer', 'user-maria-gonzalez', 'song-gratitud', NULL, NULL, 'Gratitud - Letra.pdf', 'PDF', 'application/pdf', 130000, 'dev/gratitud-letra.pdf', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('file-como-en-el-cielo-audio', 'org-banda-renacer', 'user-carlos-rodriguez', 'song-como-en-el-cielo', NULL, NULL, 'Como en el Cielo.mp3', 'AUDIO', 'audio/mpeg', 5200000, 'dev/como-en-el-cielo.mp3', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "organizationId" = EXCLUDED."organizationId",
  "uploadedById" = EXCLUDED."uploadedById",
  "songId" = EXCLUDED."songId",
  "eventId" = EXCLUDED."eventId",
  "setlistId" = EXCLUDED."setlistId",
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "mimeType" = EXCLUDED."mimeType",
  "sizeBytes" = EXCLUDED."sizeBytes",
  "storageKey" = EXCLUDED."storageKey",
  "url" = EXCLUDED."url",
  "updatedAt" = CURRENT_TIMESTAMP;

COMMIT;

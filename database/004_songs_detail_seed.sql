INSERT INTO "Song" (
  "id", "organizationId", "title", "artist", "originalKey", "currentKey", "bpm",
  "durationSec", "album", "year", "genre", "timeSignature", "language",
  "isFavorite", "coverUrl", "youtubeUrl", "lyrics", "chords", "notes", "tags",
  "status", "createdAt", "updatedAt"
) VALUES (
  'song-grande-eres-dios',
  'org-banda-renacer',
  'Grande eres Dios',
  'Miel San Marcos',
  'D',
  'D',
  72,
  270,
  'Dios de Pactos',
  2010,
  'Adoracion',
  '4/4',
  'Espanol',
  true,
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
  'https://www.youtube.com/results?search_query=Grande+eres+Dios+Miel+San+Marcos',
  E'Verso 1\nGrande eres Dios\nDigno de alabar\nTu nombre exaltare\nPor la eternidad\n\nCoro\nGrande eres Dios\nGrande es tu amor\nToda la tierra canta\nSanto es el Senor',
  E'[D]Grande eres [A]Dios\n[Bm]Digno de ala[G]bar\n[D]Tu nombre exal[A]tare\n[G]Por la eterni[D]dad',
  'Mantener el tempo estable. El puente puede subir en dinamica antes del coro final.',
  ARRAY['Favorita', 'Adoracion', 'Clasico', 'Enfasis'],
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "title" = EXCLUDED."title",
  "artist" = EXCLUDED."artist",
  "originalKey" = EXCLUDED."originalKey",
  "currentKey" = EXCLUDED."currentKey",
  "bpm" = EXCLUDED."bpm",
  "durationSec" = EXCLUDED."durationSec",
  "album" = EXCLUDED."album",
  "year" = EXCLUDED."year",
  "genre" = EXCLUDED."genre",
  "timeSignature" = EXCLUDED."timeSignature",
  "language" = EXCLUDED."language",
  "isFavorite" = EXCLUDED."isFavorite",
  "coverUrl" = EXCLUDED."coverUrl",
  "youtubeUrl" = EXCLUDED."youtubeUrl",
  "lyrics" = EXCLUDED."lyrics",
  "chords" = EXCLUDED."chords",
  "notes" = EXCLUDED."notes",
  "tags" = EXCLUDED."tags",
  "status" = EXCLUDED."status",
  "updatedAt" = CURRENT_TIMESTAMP;

DELETE FROM "SongTrack" WHERE "songId" = 'song-grande-eres-dios';

INSERT INTO "SongTrack" ("id", "songId", "name", "durationSec", "isPrimary", "sortOrder", "createdAt", "updatedAt") VALUES
  ('track-grande-guia', 'song-grande-eres-dios', 'Guia (Voz y Guitarra)', 270, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('track-grande-completa', 'song-grande-eres-dios', 'Pista completa', 270, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('track-grande-bateria', 'song-grande-eres-dios', 'Bateria', 270, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('track-grande-bajo', 'song-grande-eres-dios', 'Bajo', 270, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('track-grande-guitarras', 'song-grande-eres-dios', 'Guitarras', 270, false, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('track-grande-teclado', 'song-grande-eres-dios', 'Teclado', 270, false, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('track-grande-pads', 'song-grande-eres-dios', 'Pads', 270, false, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('track-grande-coro', 'song-grande-eres-dios', 'Coro', 270, false, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('track-grande-click', 'song-grande-eres-dios', 'Click', 270, false, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "File" (
  "id", "organizationId", "songId", "name", "type", "mimeType", "sizeBytes",
  "storageKey", "url", "createdAt", "updatedAt"
) VALUES
  ('file-grande-acordes', 'org-banda-renacer', 'song-grande-eres-dios', 'Acordes - Grande eres Dios.pdf', 'PDF', 'application/pdf', 420000, 'songs/grande-eres-dios/acordes.pdf', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('file-grande-letra', 'org-banda-renacer', 'song-grande-eres-dios', 'Letra congregacional.docx', 'DOCUMENT', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 180000, 'songs/grande-eres-dios/letra.docx', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "mimeType" = EXCLUDED."mimeType",
  "sizeBytes" = EXCLUDED."sizeBytes",
  "storageKey" = EXCLUDED."storageKey",
  "updatedAt" = CURRENT_TIMESTAMP;

import { Prisma } from '@prisma/client';

/** Formas de consulta que comparten los repositorios de canciones (la cancion trae sus pistas, enlaces y archivos). */

export const trackOrderBy: Prisma.SongTrackOrderByWithRelationInput[] = [
  { isPrimary: 'desc' },
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

export const trackSelect = {
  id: true,
  songId: true,
  versionId: true,
  name: true,
  type: true,
  instrument: true,
  mimeType: true,
  sizeBytes: true,
  durationSec: true,
  originalFileName: true,
  url: true,
  provider: true,
  volumeDefault: true,
  panDefault: true,
  isPrimary: true,
  sortOrder: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  version: {
    select: {
      id: true,
      name: true,
      key: true,
      isDefault: true,
    },
  },
  uploadedBy: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.SongTrackSelect;

export function sameTrackContext(versionId: string | null) {
  return versionId ? { versionId } : { versionId: null };
}

export const linkOrderBy: Prisma.SongLinkOrderByWithRelationInput[] = [
  { isPrimary: 'desc' },
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

export const linkInclude = {
  version: { select: { id: true, name: true, key: true, isDefault: true } },
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.SongLinkInclude;

export const songFileOrderBy: Prisma.SongFileOrderByWithRelationInput[] = [
  { isPrimary: 'desc' },
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

// Select deliberadamente sin storageKey/checksum/organizationId: esta forma se
// usa tanto en respuestas normalizadas como en el include anidado de detail(),
// que no vuelve a pasar por el normalizador. storageKey solo se lee en las
// consultas internas dedicadas (songFileContext) para servir stream/download.
export const songFileInclude = {
  version: { select: { id: true, name: true, key: true, isDefault: true } },
  file: {
    select: {
      id: true,
      name: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      url: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
} satisfies Prisma.SongFileInclude;

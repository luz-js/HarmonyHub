import { z } from 'zod';
import type { SetlistItemType } from './enums';

// ======================= Pedidos =======================

/** Cuanto dura un enlace de solo lectura: 7 dias, 30 dias (por defecto) o sin vencimiento (hasta revocarlo). */
export const SHARE_LINK_DURATIONS = ['7d', '30d', 'never'] as const;
export type ShareLinkDuration = (typeof SHARE_LINK_DURATIONS)[number];

/** POST /api/setlists/:id/share-links */
export const createShareLinkSchema = z.object({
  duration: z.enum(SHARE_LINK_DURATIONS).default('30d'),
});
export type CreateShareLinkInput = z.input<typeof createShareLinkSchema>;
export type CreateShareLinkData = z.output<typeof createShareLinkSchema>;

// ======================= Respuestas =======================

/** Un enlace activo (sin el token: solo se ve una vez, al crearlo). */
export type ShareLink = {
  id: string;
  createdAt: string;
  expiresAt: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
  createdBy: { id: string; name: string } | null;
};

/** GET /api/setlists/:id/share-links */
export type ShareLinkList = { items: ShareLink[] };

/** POST /api/setlists/:id/share-links: el token va solo en esta respuesta. */
export type CreatedShareLink = ShareLink & { token: string };

/** Letra y acordes de una cancion compartida (solo secciones y lineas; sin notas). */
export type SharedSongContent = {
  version: 1;
  sections: Array<{
    id: string;
    type: string;
    name: string;
    order: number;
    lines: Array<{ id: string; order: number; chords: string; lyrics: string }>;
  }>;
};

export type SharedSetlistItem = {
  order: number;
  type: SetlistItemType;
  title: string;
  artist: string | null;
  /** Tonalidad en la que el setlist toca la cancion (la letra y acordes ya vienen en esta tonalidad base). */
  key: string | null;
  /** Tonalidad en que esta escrita la version; si difiere de `key`, la pagina transporta al mostrar. */
  originalKey: string | null;
  content: SharedSongContent | null;
};

/** GET /api/public/shared-setlists/:token (sin sesion): lo minimo para tocar, nada del equipo ni de la organizacion. */
export type SharedSetlist = {
  name: string;
  eventStartsAt: string | null;
  items: SharedSetlistItem[];
};

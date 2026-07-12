import { z } from 'zod';

export const SongSectionTypeSchema = z.enum([
  'INTRO',
  'VERSE',
  'PRE_CHORUS',
  'CHORUS',
  'BRIDGE',
  'INTERLUDE',
  'INSTRUMENTAL',
  'SOLO',
  'ENDING',
  'CUSTOM',
]);

export const SongLineSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  chords: z.string(),
  lyrics: z.string(),
});

export const SongSectionSchema = z.object({
  id: z.string().min(1),
  type: SongSectionTypeSchema,
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  chords: z.array(z.string()).optional(),
  lyrics: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(SongLineSchema),
  collapsed: z.boolean().optional(),
});

export const SongContentSchema = z.object({
  version: z.literal(1),
  sections: z.array(SongSectionSchema),
});

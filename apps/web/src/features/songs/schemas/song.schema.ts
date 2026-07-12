import { z } from 'zod';

export const songFormSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  currentKey: z.string().min(1),
  originalKey: z.string().min(1),
  bpm: z.coerce.number().optional(),
  durationSec: z.coerce.number().optional(),
  tags: z.string().optional(),
});

import { z } from 'zod';

export const setlistSchema = z.object({
  name: z.string().min(1),
  date: z.string().min(1).optional(),
});

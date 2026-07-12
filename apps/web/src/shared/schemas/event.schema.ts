import { z } from 'zod';

export const eventSchema = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  location: z.string().min(1),
});

import { z } from 'zod';

export const setlistFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(150),
  description: z.string().trim().max(2000).optional(),
});

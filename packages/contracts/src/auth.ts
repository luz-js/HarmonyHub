import { z } from 'zod';
import type { SetlistMusicalRole } from './enums';
import type { OrganizationSummary } from './organizations';

// ---- Pedidos ----

/** POST /api/login. El correo se guarda y se busca siempre en minusculas. */
export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1),
});
export type LoginInput = z.input<typeof loginSchema>;

/** POST /api/auth/register */
export const registerSchema = z.object({
  name: z.string().min(1).transform((value) => value.trim()),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Las contrasenas no coinciden',
  path: ['confirmPassword'],
});
export type RegisterInput = z.input<typeof registerSchema>;

// ---- Respuestas ----

/** Lo que la persona sabe tocar (lo edita en "Mi perfil"); el principal viene primero. */
export type UserInstrumentRef = {
  instrument: SetlistMusicalRole;
  isPrimary: boolean;
};

export type UserInstrument = UserInstrumentRef & { id: string };

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  active?: boolean;
  createdAt?: string;
  instruments?: UserInstrument[];
  role?: string;
  currentOrganizationId?: string;
  currentOrganizationSlug?: string;
  organizations: OrganizationSummary[];
};

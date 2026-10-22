import { z } from 'zod';
import type { UserInstrumentRef } from './auth';
import { MEMBERSHIP_ROLES, MEMBERSHIP_STATUSES, type MembershipRole, type MembershipStatus } from './enums';

// ---- Pedidos ----

/** PATCH /api/memberships/:id. El instrumento no vive en la membresia: cada persona lo elige en "Mi perfil". */
export const updateMembershipSchema = z.object({
  role: z.enum(MEMBERSHIP_ROLES).optional(),
  status: z.enum(MEMBERSHIP_STATUSES).optional(),
});
export type UpdateMembershipInput = z.input<typeof updateMembershipSchema>;
export type UpdateMembershipData = z.output<typeof updateMembershipSchema>;

// ---- Respuestas ----

/** Fila de GET /api/memberships: la persona dentro de la organizacion, con lo que sabe tocar segun su perfil. */
export type OrganizationMember = {
  id: string;
  userId: string;
  organizationId: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    active: boolean;
    createdAt: string;
    instruments: UserInstrumentRef[];
  };
};

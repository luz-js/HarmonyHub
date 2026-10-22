import { z } from 'zod';
import { MEMBERSHIP_ROLES, type InvitationStatus, type MembershipRole } from './enums';

// ---- Pedidos ----

/** POST /api/invitations. La organizacion va en el cuerpo (de ahi la toma el guard de permisos). */
export const createInvitationSchema = z.object({
  organizationId: z.string().min(1),
  email: z.string().trim().toLowerCase().email('Escribe un correo valido'),
  role: z.enum(MEMBERSHIP_ROLES).default('MUSICIAN'),
});
export type CreateInvitationInput = z.input<typeof createInvitationSchema>;
export type CreateInvitationData = z.output<typeof createInvitationSchema>;

// ---- Respuestas ----

/** Invitacion tal como la ve quien gestiona la organizacion (sin token: aceptar depende del correo de quien entra). */
export type InvitationSummary = {
  id: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedBy: { id: string; name: string } | null;
};

/** "Mis invitaciones": una invitacion para el correo de quien inicio sesion. */
export type MyInvitation = {
  id: string;
  email: string;
  role: MembershipRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  organization: { id: string; name: string; slug: string };
  invitedBy: { id: string; name: string } | null;
};

/** Al aceptar: la organizacion a la que entra, con su rol, para activarla en la sesion. */
export type AcceptedInvitation = { organization: { id: string; name: string; slug: string; role: MembershipRole } };

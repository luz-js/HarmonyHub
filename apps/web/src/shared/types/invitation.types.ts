import type { MembershipRole } from './membership.types';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';

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

export type CreateInvitationInput = { organizationId: string; email: string; role: MembershipRole };

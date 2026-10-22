import type { MembershipRole } from './membership.types';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED' | 'DECLINED';

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

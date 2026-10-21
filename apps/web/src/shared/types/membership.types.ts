import type { UserInstrumentRef } from './auth.types';

export type MembershipRole = 'OWNER' | 'ADMIN' | 'LEADER' | 'MUSICIAN' | 'GUEST';

export type MembershipStatus = 'ACTIVE' | 'INACTIVE' | 'INVITED';

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

export type UpdateMembershipInput = {
  role?: MembershipRole;
  status?: MembershipStatus;
};

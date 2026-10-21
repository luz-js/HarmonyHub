import type { OrganizationSummary } from './organization.types';
import type { SetlistMusicalRole } from './setlist.types';

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

export type UpdateMeInput = {
  name?: string;
  phone?: string | null;
};

export type ReplaceMyInstrumentsInput = {
  instruments: { instrument: SetlistMusicalRole; isPrimary?: boolean }[];
};

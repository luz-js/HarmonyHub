import type { OrganizationSummary } from './organization.types';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  active?: boolean;
  createdAt?: string;
  role?: string;
  currentOrganizationId?: string;
  currentOrganizationSlug?: string;
  organizations: OrganizationSummary[];
};

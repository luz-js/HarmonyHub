export type OrganizationSummary = {
  id: string;
  slug: string;
  name: string;
  type?: string;
  description?: string | null;
  primaryColor?: string;
  role?: string;
  archivedAt?: string | null;
};

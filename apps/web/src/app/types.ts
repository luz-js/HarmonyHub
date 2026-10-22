export type AppOrganization = {
  id: string;
  slug: string;
  name: string;
  role?: string;
  /** Archivada: de solo lectura hasta que un propietario la restaure. */
  archivedAt?: string | null;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  currentOrganizationId?: string;
  currentOrganizationSlug?: string;
  organizations?: AppOrganization[];
};

export type Navigate = (href: string) => void;

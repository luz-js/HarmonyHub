import { useQuery } from '@tanstack/react-query';
import { listOrganizationFiles } from './api/files.client';

export function useOrganizationFiles(organizationId?: string) {
  return useQuery({
    queryKey: ['files', organizationId],
    queryFn: () => listOrganizationFiles().then((result) => result.items),
    enabled: Boolean(organizationId),
  });
}

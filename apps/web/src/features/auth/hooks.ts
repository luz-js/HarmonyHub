import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from './api/auth.client';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: () => getCurrentUser().then((result) => result.user),
  });
}

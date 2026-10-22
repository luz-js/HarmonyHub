import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { PwaBanners } from '../pwa/components/PwaBanners';
import { queryClient } from '../shared/api/query-client';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <PwaBanners />
    </QueryClientProvider>
  );
}

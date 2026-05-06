import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';

type StatusReport = components['schemas']['StatusReport'];

export function useStatus() {
  return useQuery<StatusReport>({
    queryKey: ['public', 'status'],
    queryFn: ({ signal }) => api.get<StatusReport>('/api/public/status', { signal }),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

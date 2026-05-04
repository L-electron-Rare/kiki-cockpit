import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';

type WorkerStatus = components['schemas']['WorkerStatus'];

export function useWorkersStatus() {
  return useQuery<WorkerStatus[]>({
    queryKey: ['workers-status'],
    queryFn: ({ signal }) => api.get<WorkerStatus[]>('/api/admin/workers/status', { signal }),
    refetchInterval: 5_000,
  });
}

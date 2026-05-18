import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';

type WorkerStatus = components['schemas']['AdminWorkerStatus'];

export function useWorkersStatus() {
  return useQuery<WorkerStatus[]>({
    queryKey: ['workers-status'],
    queryFn: ({ signal }) => api.get<WorkerStatus[]>('/api/admin/workers/status', { signal }),
    refetchInterval: 5_000,
  });
}

import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';

type DatasetSummary = components['schemas']['DatasetSummary'];

export function useDatasets() {
  return useQuery<DatasetSummary[]>({
    queryKey: ['datasets'],
    queryFn: ({ signal }) => api.get<DatasetSummary[]>('/api/admin/datasets', { signal }),
    staleTime: 60_000,
  });
}

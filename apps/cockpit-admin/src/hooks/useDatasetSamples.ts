import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';

type DatasetPage = components['schemas']['DatasetPage'];

interface UseDatasetSamplesParams {
  domain: string;
  offset?: number;
  limit?: number;
  search?: string;
}

export function useDatasetSamples({
  domain,
  offset = 0,
  limit = 10,
  search,
}: UseDatasetSamplesParams) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (search) params.set('search', search);

  return useQuery<DatasetPage>({
    queryKey: ['dataset-samples', domain, offset, limit, search ?? ''],
    queryFn: ({ signal }) =>
      api.get<DatasetPage>(`/api/admin/datasets/${domain}/samples?${params}`, { signal }),
    staleTime: 30_000,
  });
}

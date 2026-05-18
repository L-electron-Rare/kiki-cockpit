import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type Flag = components['schemas']['Flag'];

export function useDatasetFlags(domain: string) {
  const qc = useQueryClient();
  const key = ['dataset-flags', domain];

  const query = useQuery<Flag[]>({
    queryKey: key,
    queryFn: ({ signal }) => api.get<Flag[]>(`/api/admin/datasets/${domain}/flags`, { signal }),
    staleTime: 30_000,
  });

  const flag = useMutation({
    mutationFn: ({ idx, reason }: { idx: number; reason: string }) =>
      api.post<Flag>(`/api/admin/datasets/${domain}/flags`, { idx, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const unflag = useMutation({
    mutationFn: ({ idx }: { idx: number }) =>
      api.delete<void>(`/api/admin/datasets/${domain}/flags/${idx}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { query, flag, unflag };
}

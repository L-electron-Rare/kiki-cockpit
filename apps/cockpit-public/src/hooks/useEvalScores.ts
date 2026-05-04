import { api } from '@/lib/api';
import { ApiError } from '@cockpit/shared';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';

type EvalSummary = components['schemas']['EvalSummary'];

export function useEvalScores(owner: string, name: string) {
  return useQuery<EvalSummary | null>({
    queryKey: ['eval', owner, name],
    queryFn: async ({ signal }) => {
      try {
        return await api.get<EvalSummary>(`/api/public/eval/${owner}/${name}`, { signal });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  });
}

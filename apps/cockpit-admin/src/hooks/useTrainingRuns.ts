import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';

type TrainingRun = components['schemas']['TrainingRun'];

export function useTrainingRuns() {
  return useQuery<TrainingRun[]>({
    queryKey: ['training-runs'],
    queryFn: ({ signal }) => api.get<TrainingRun[]>('/api/admin/training/runs', { signal }),
    refetchInterval: 5_000,
  });
}

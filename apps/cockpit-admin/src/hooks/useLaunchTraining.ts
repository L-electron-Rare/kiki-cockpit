import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type LaunchRequest = components['schemas']['LaunchRequest'];
type LaunchResponse = components['schemas']['LaunchResponse'];

export function useLaunchTraining() {
  const qc = useQueryClient();
  return useMutation<LaunchResponse, Error, LaunchRequest>({
    mutationFn: (body) => api.post<LaunchResponse>('/api/admin/training/launch', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-runs'] });
    },
  });
}

import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';

type TelemetryResponse = components['schemas']['TelemetryResponse'];

export function useTelemetry() {
  return useQuery<TelemetryResponse>({
    queryKey: ['telemetry'],
    queryFn: ({ signal }) => api.get<TelemetryResponse>('/api/public/telemetry', { signal }),
    refetchInterval: 5000,
  });
}

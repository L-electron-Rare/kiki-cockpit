import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';

type BenchmarkRun = components['schemas']['BenchmarkRun'];

export function useBenchmarks() {
  return useQuery<BenchmarkRun[]>({
    queryKey: ['benchmarks'],
    queryFn: ({ signal }) => api.get<BenchmarkRun[]>('/api/admin/benchmarks', { signal }),
    staleTime: 300_000,
  });
}

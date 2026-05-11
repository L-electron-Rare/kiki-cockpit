import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export interface MascaradeLora {
  name: string;
  domain: string;
  steps: number;
  blurb: string;
  validator: string;
}

export function useMascaradeLoras(enabled: boolean) {
  return useQuery<MascaradeLora[]>({
    queryKey: ['public', 'mascarade-loras'],
    queryFn: ({ signal }) =>
      api.get<MascaradeLora[]>('/api/public/models/ailiance/mascarade/loras', { signal }),
    enabled,
    staleTime: 60_000,
  });
}

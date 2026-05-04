import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';

type ModelCard = components['schemas']['ModelCard'];

export interface ModelFilters {
  domain?: string;
  baseModel?: string;
  status?: string;
}

export function useModels(filters: ModelFilters = {}) {
  return useQuery<ModelCard[]>({
    queryKey: ['models', filters],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (filters.domain) params.set('domain', filters.domain);
      if (filters.baseModel) params.set('base_model', filters.baseModel);
      if (filters.status) params.set('status', filters.status);
      const query = params.toString();
      return api.get<ModelCard[]>(`/api/public/models${query ? `?${query}` : ''}`, { signal });
    },
  });
}

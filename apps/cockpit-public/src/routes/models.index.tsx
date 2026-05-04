import { ModelCard } from '@/components/ModelCard';
import { BaseModelFilter } from '@/components/filters/BaseModelFilter';
import { DomainFilter } from '@/components/filters/DomainFilter';
import { StatusFilter } from '@/components/filters/StatusFilter';
import { useModels } from '@/hooks/useModels';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { z } from 'zod';

const searchSchema = z.object({
  domain: z.string().optional(),
  base: z.string().optional(),
  status: z.string().optional(),
});

export const Route = createFileRoute('/models/')({
  component: ModelsPage,
  validateSearch: searchSchema,
});

function ModelsPage() {
  const search = useSearch({ from: '/models/' });
  const navigate = useNavigate({ from: '/models/' });

  const { data, isLoading, error } = useModels({
    domain: search.domain,
    baseModel: search.base,
    status: search.status,
  });

  const setFilter = (key: 'domain' | 'base' | 'status', value: string | undefined) => {
    navigate({ search: { ...search, [key]: value } });
  };

  if (isLoading) return <p className="text-slate-500">Loading models…</p>;
  if (error) return <p className="text-rose-700">Failed to load models</p>;

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">Models ({data?.length ?? 0})</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <DomainFilter value={search.domain} onChange={(v) => setFilter('domain', v)} />
          <BaseModelFilter value={search.base} onChange={(v) => setFilter('base', v)} />
          <StatusFilter value={search.status} onChange={(v) => setFilter('status', v)} />
        </div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.map((card) => (
          <ModelCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

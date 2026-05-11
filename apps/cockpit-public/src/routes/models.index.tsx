import { ModelCard } from '@/components/ModelCard';
import { BaseModelFilter } from '@/components/filters/BaseModelFilter';
import { DomainFilter } from '@/components/filters/DomainFilter';
import { StatusFilter } from '@/components/filters/StatusFilter';
import { useModels } from '@/hooks/useModels';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
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

  const [searchText, setSearchText] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');

  const cards = data ?? [];

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return cards.filter((c) => {
      if (kindFilter !== 'all' && c.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        c.id.toLowerCase().includes(q) ||
        c.display_name.toLowerCase().includes(q) ||
        (c.base_model ?? '').toLowerCase().includes(q)
      );
    });
  }, [cards, searchText, kindFilter]);

  const setFilter = (key: 'domain' | 'base' | 'status', value: string | undefined) => {
    navigate({ search: { ...search, [key]: value } });
  };

  if (isLoading) return <p className="text-slate-500">Loading models…</p>;
  if (error) return <p className="text-rose-700">Failed to load models</p>;

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">Models ({filtered.length})</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <DomainFilter value={search.domain} onChange={(v) => setFilter('domain', v)} />
          <BaseModelFilter value={search.base} onChange={(v) => setFilter('base', v)} />
          <StatusFilter value={search.status} onChange={(v) => setFilter('status', v)} />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by id, name, base…"
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="all">All kinds</option>
            <option value="base">base</option>
            <option value="fine_tuned">fine-tune</option>
            <option value="lora">LoRA</option>
            <option value="quantized">quantized</option>
          </select>
        </div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((card) => (
          <ModelCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

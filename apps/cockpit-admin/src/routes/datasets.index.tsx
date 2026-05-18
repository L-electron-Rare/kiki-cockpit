import { createFileRoute } from '@tanstack/react-router';

import { DatasetCard } from '@/components/DatasetCard';
import { useDatasets } from '@/hooks/useDatasets';

export const Route = createFileRoute('/datasets/')({
  component: DatasetsPage,
});

function DatasetsPage() {
  const { data, isLoading, error } = useDatasets();

  if (isLoading) return <p className="text-slate-400">Chargement…</p>;
  if (error) return <p className="text-red-400">Failed to load datasets</p>;
  if (!data || data.length === 0) return <p className="text-slate-400">Aucun dataset trouvé</p>;

  const totalRows = data.reduce((acc, d) => acc + d.n_rows, 0);
  const totalMb = data.reduce((acc, d) => acc + d.size_mb, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Datasets</h1>
        <p className="text-sm text-slate-400">
          {data.length} domaines · {totalRows.toLocaleString('fr-FR')} rows · {totalMb.toFixed(0)}{' '}
          MB ·<span className="ml-1 text-emerald-400">100 % EU AI Act traceable</span>
        </p>
      </header>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((d) => (
          <DatasetCard key={d.domain} dataset={d} />
        ))}
      </div>
    </div>
  );
}

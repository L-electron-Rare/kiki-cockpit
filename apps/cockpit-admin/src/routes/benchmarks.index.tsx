import { createFileRoute } from '@tanstack/react-router';

import { BenchmarkTable } from '@/components/BenchmarkTable';
import { useBenchmarks } from '@/hooks/useBenchmarks';
import type { components } from '@cockpit/shared';

type BenchmarkRun = components['schemas']['BenchmarkRun'];

export const Route = createFileRoute('/benchmarks/')({
  component: BenchmarksPage,
});

function BenchmarksPage() {
  const { data, isLoading, error } = useBenchmarks();

  if (isLoading) return <p className="text-slate-400">Chargement…</p>;
  if (error) return <p className="text-red-400">Failed to load benchmarks</p>;
  if (!data || data.length === 0) return <p className="text-slate-400">Aucun benchmark trouvé</p>;

  // Group by benchmark name, preserving backend sort order within each group
  const groups = new Map<string, BenchmarkRun[]>();
  for (const run of data) {
    const list = groups.get(run.benchmark) ?? [];
    list.push(run);
    groups.set(run.benchmark, list);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Benchmarks</h1>
        <p className="text-sm text-slate-400">
          {data.length} runs · {groups.size} suites
        </p>
      </header>
      {Array.from(groups.entries()).map(([benchmark, runs]) => (
        <BenchmarkTable key={benchmark} benchmark={benchmark} runs={runs} />
      ))}
    </div>
  );
}

import { TrainingRunCard } from '@/components/TrainingRunCard';
import { useTrainingRuns } from '@/hooks/useTrainingRuns';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/training/')({
  component: TrainingListPage,
});

function TrainingListPage() {
  const { data, isLoading, error } = useTrainingRuns();

  if (isLoading) return <p className="text-slate-500">Loading runs…</p>;
  if (error) return <p className="text-rose-700">Failed to load runs</p>;
  if (!data || data.length === 0) {
    return <p className="text-slate-500">No training runs found in the configured directories.</p>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Training runs ({data.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((run) => (
          <TrainingRunCard key={run.id} run={run} />
        ))}
      </div>
    </div>
  );
}

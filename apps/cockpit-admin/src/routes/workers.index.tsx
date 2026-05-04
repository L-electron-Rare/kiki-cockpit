import { createFileRoute } from '@tanstack/react-router';
import { useWorkersStatus } from '@/hooks/useWorkersStatus';
import { WorkerStatusGrid } from '@/components/WorkerStatusGrid';

export const Route = createFileRoute('/workers/')({
  component: WorkersPage,
});

function WorkersPage() {
  const { data, isLoading, error } = useWorkersStatus();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-rose-700">Failed to load workers</p>;
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Workers</h2>
      <WorkerStatusGrid workers={data ?? []} />
    </div>
  );
}

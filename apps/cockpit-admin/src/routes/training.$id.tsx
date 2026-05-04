import { LogTail } from '@/components/LogTail';
import { LossChart } from '@/components/LossChart';
import { useTrainingLogs } from '@/hooks/useTrainingLogs';
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

type TrainingRun = components['schemas']['TrainingRun'];

export const Route = createFileRoute('/training/$id')({
  component: TrainingDetailPage,
});

function TrainingDetailPage() {
  const { id } = Route.useParams();
  const runQuery = useQuery<TrainingRun>({
    queryKey: ['training-run', id],
    queryFn: ({ signal }) => api.get<TrainingRun>(`/api/admin/training/runs/${id}`, { signal }),
    refetchInterval: 5_000,
  });

  const { events, metrics, connected } = useTrainingLogs(id);

  if (runQuery.isLoading) return <p>Loading…</p>;
  if (runQuery.error || !runQuery.data) return <p className="text-rose-700">Run not found</p>;
  const run = runQuery.data;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{run.id}</h2>
        <p className="text-sm text-slate-500">
          {run.machine} · {run.status} · iter {run.last_iter ?? '—'} ·
          {connected ? ' streaming' : ' not connected'}
        </p>
      </header>

      <section>
        <h3 className="font-bold mb-2">Loss curve</h3>
        <LossChart metrics={metrics.length > 0 ? metrics : []} />
      </section>

      <section>
        <h3 className="font-bold mb-2">Logs ({events.length})</h3>
        <LogTail events={events} />
      </section>
    </div>
  );
}

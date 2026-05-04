import { useTrainingRuns } from '@/hooks/useTrainingRuns';
import { useWorkersStatus } from '@/hooks/useWorkersStatus';
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';

type EvalResult = components['schemas']['EvalResult'];

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const runs = useTrainingRuns();
  const workers = useWorkersStatus();
  const evals = useQuery<EvalResult[]>({
    queryKey: ['eval-results'],
    queryFn: ({ signal }) => api.get<EvalResult[]>('/api/admin/eval/results', { signal }),
  });

  const activeRuns = (runs.data ?? []).filter((r) => r.status === 'active');
  const downWorkers = (workers.data ?? []).filter((w) => w.health === 'down');
  const latestEval = (evals.data ?? [])[0];
  const lastRun = (runs.data ?? [])[0];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Widget
          title="Active trainings"
          value={`${activeRuns.length}`}
          subtitle={lastRun ? `last: ${lastRun.id}` : 'no recent run'}
          link={{ to: '/training', label: 'View →' }}
        />
        <Widget
          title="Workers down"
          value={`${downWorkers.length}`}
          subtitle={`${(workers.data ?? []).length} configured`}
          tone={downWorkers.length > 0 ? 'rose' : 'emerald'}
          link={{ to: '/workers', label: 'View →' }}
        />
        <Widget
          title="Latest eval"
          value={latestEval ? `${(latestEval.score * 100).toFixed(1)}%` : '—'}
          subtitle={latestEval ? `${latestEval.benchmark} · ${latestEval.model_id}` : 'no eval'}
          link={{ to: '/eval', label: 'View →' }}
        />
        <Widget
          title="Total eval runs"
          value={`${(evals.data ?? []).length}`}
          subtitle="across all models"
          link={{ to: '/eval', label: 'View →' }}
        />
      </div>
    </div>
  );
}

function Widget({
  title,
  value,
  subtitle,
  tone,
  link,
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: 'emerald' | 'rose';
  link?: { to: string; label: string };
}) {
  const valueColor =
    tone === 'rose' ? 'text-rose-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-slate-900';
  return (
    <article className="rounded border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <p className={`mt-1 text-3xl font-bold ${valueColor}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      {link && (
        <Link
          to={link.to as never}
          className="mt-3 inline-block text-sm text-emerald-700 hover:underline"
        >
          {link.label}
        </Link>
      )}
    </article>
  );
}

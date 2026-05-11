import { useStatus } from '@/hooks/useStatus';
import { createFileRoute } from '@tanstack/react-router';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/status')({
  component: StatusPage,
});

function StatusPage() {
  const { data, isLoading, isError } = useStatus();

  if (isLoading) return <p>Loading…</p>;
  if (isError || !data) return <p className="text-rose-700">Failed to load status.</p>;

  return (
    <article className="max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Live status</h1>
          <p className="text-sm text-slate-500">
            {data.healthy_count} of {data.total_count} workers healthy ·
            refreshed every 15 s
          </p>
        </div>
        <Activity className="text-emerald-600" size={32} />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.workers.map((w) => (
          <div
            key={w.id}
            className={`rounded border p-3 ${
              w.healthy
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
            }`}
          >
            <header className="flex items-center justify-between">
              <h3 className="font-semibold">{w.label}</h3>
              {w.healthy ? (
                <CheckCircle2 className="text-emerald-600" size={18} />
              ) : (
                <AlertCircle className="text-rose-600" size={18} />
              )}
            </header>
            <p className="text-xs text-slate-600">{w.host}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-2 text-xs text-slate-700">
              <dt>latency</dt>
              <dd>{w.latency_ms ? `${w.latency_ms} ms` : '—'}</dd>
              <dt>model loaded</dt>
              <dd>{w.model_loaded ? 'yes' : 'no'}</dd>
              <dt>uptime</dt>
              <dd>{w.uptime_s ? `${Math.floor(w.uptime_s / 60)} min` : '—'}</dd>
            </dl>
            {w.error && (
              <p className="mt-2 text-xs font-mono text-rose-700 truncate" title={w.error}>
                {w.error}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Last update: {new Date(data.timestamp).toLocaleString()}
      </p>
    </article>
  );
}

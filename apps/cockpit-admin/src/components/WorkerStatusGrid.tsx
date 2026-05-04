import type { components } from '@cockpit/shared';

type Worker = components['schemas']['WorkerStatus'];

interface Props {
  workers: Worker[];
}

export function WorkerStatusGrid({ workers }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {workers.map((w) => (
        <WorkerCard key={w.name} worker={w} />
      ))}
    </div>
  );
}

function WorkerCard({ worker }: { worker: Worker }) {
  const colors: Record<string, string> = {
    ok: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
    down: 'border-rose-300 bg-rose-50 text-rose-900',
  };
  const cls = colors[worker.health] ?? colors.down;
  return (
    <article className={`rounded border-2 ${cls} p-3`}>
      <h4 className="font-bold">{worker.name}</h4>
      <p className="text-xs opacity-75 break-all">{worker.url}</p>
      <dl className="mt-2 text-sm space-y-1">
        <div className="flex justify-between">
          <dt>Health</dt>
          <dd className="font-mono">{worker.health}</dd>
        </div>
        {worker.latency_ms != null && (
          <div className="flex justify-between">
            <dt>Latency</dt>
            <dd className="font-mono">{worker.latency_ms.toFixed(0)} ms</dd>
          </div>
        )}
        {worker.error && <p className="text-xs italic">Error: {worker.error}</p>}
      </dl>
    </article>
  );
}

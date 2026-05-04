import type { components } from '@cockpit/shared';
import { Link } from '@tanstack/react-router';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

type Run = components['schemas']['TrainingRun'];

interface Props {
  run: Run;
}

export function TrainingRunCard({ run }: Props) {
  const Icon =
    run.status === 'active' ? Activity : run.status === 'completed' ? CheckCircle2 : AlertCircle;
  const color =
    run.status === 'active'
      ? 'text-emerald-600'
      : run.status === 'completed'
        ? 'text-slate-500'
        : 'text-rose-600';
  return (
    <Link
      to="/training/$id"
      params={{ id: run.id }}
      className="block rounded border border-slate-200 bg-white p-4 hover:shadow-sm"
    >
      <header className="flex items-center justify-between">
        <h3 className="font-bold">{run.id}</h3>
        <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
          <Icon size={14} /> {run.status}
        </span>
      </header>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-slate-500">Machine</dt>
        <dd>{run.machine}</dd>
        <dt className="text-slate-500">Iter</dt>
        <dd className="font-mono">{run.last_iter ?? '—'}</dd>
        <dt className="text-slate-500">Train loss</dt>
        <dd className="font-mono">{run.last_train_loss?.toFixed(4) ?? '—'}</dd>
        <dt className="text-slate-500">Val loss</dt>
        <dd className="font-mono">{run.last_val_loss?.toFixed(4) ?? '—'}</dd>
      </dl>
    </Link>
  );
}

import type { components } from '@cockpit/shared';

type BenchmarkRun = components['schemas']['BenchmarkRun'];

interface Props {
  benchmark: string;
  runs: BenchmarkRun[];
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) return <span className="text-emerald-400 font-mono">+{delta}</span>;
  if (delta < 0) return <span className="text-red-400 font-mono">{delta}</span>;
  return <span className="text-slate-500 font-mono">0</span>;
}

export function BenchmarkTable({ benchmark, runs }: Props) {
  return (
    <section className="space-y-2">
      <header className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold text-violet-400">{benchmark}</h2>
        <span className="text-xs text-slate-500">{runs.length} run{runs.length !== 1 ? 's' : ''}</span>
      </header>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm text-slate-300">
          <thead className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">Adapter</th>
              <th className="px-4 py-2 text-right">Score</th>
              <th className="px-4 py-2 text-right">Δ vs base</th>
              <th className="px-4 py-2 text-right">n</th>
              <th className="px-4 py-2 text-left">Verdict</th>
              <th className="px-4 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {runs.map((run) => (
              <tr key={run.run_id} className="hover:bg-slate-800/50 transition">
                <td className="px-4 py-2 font-medium">{run.adapter}</td>
                <td className="px-4 py-2 text-right font-mono">
                  {run.score}{run.score_unit}
                </td>
                <td className="px-4 py-2 text-right">
                  <DeltaBadge delta={run.delta_vs_base} />
                </td>
                <td className="px-4 py-2 text-right text-slate-400">{run.n_samples}</td>
                <td className="px-4 py-2">
                  <span className="inline-block rounded px-1.5 py-0.5 text-xs bg-slate-700 text-slate-200">
                    {run.verdict}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-400 text-xs">{run.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

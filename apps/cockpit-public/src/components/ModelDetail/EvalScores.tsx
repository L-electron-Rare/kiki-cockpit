import type { components } from '@cockpit/shared';

type EvalSummary = components['schemas']['EvalSummary'];

interface Props {
  summary: EvalSummary | null;
}

export function EvalScores({ summary }: Props) {
  if (!summary || !summary.by_benchmark || Object.keys(summary.by_benchmark).length === 0) {
    return (
      <section className="rounded border border-slate-200 p-4">
        <h3 className="font-bold mb-3">Eval scores</h3>
        <p className="text-sm text-slate-500">No eval results yet.</p>
      </section>
    );
  }
  const entries = Object.entries(summary.by_benchmark);
  return (
    <section className="rounded border border-slate-200 p-4">
      <h3 className="font-bold mb-3">Eval scores</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="py-2">Benchmark</th>
            <th className="py-2">Metric</th>
            <th className="py-2">Score</th>
            <th className="py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([benchmark, result]) => (
            <tr key={benchmark} className="border-b border-slate-100">
              <td className="py-2 font-mono">{benchmark}</td>
              <td className="py-2 text-slate-500">{result.metric}</td>
              <td className="py-2 font-mono">{(result.score * 100).toFixed(1)}%</td>
              <td className="py-2 text-slate-500">
                {new Date(result.timestamp).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

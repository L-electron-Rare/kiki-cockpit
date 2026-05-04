import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';

type EvalResult = components['schemas']['EvalResult'];

export const Route = createFileRoute('/eval/')({
  component: EvalPage,
});

function EvalPage() {
  const { data, isLoading, error } = useQuery<EvalResult[]>({
    queryKey: ['eval-results'],
    queryFn: ({ signal }) => api.get<EvalResult[]>('/api/admin/eval/results', { signal }),
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-rose-700">Failed to load eval results</p>;
  if (!data || data.length === 0) return <p className="text-slate-500">No eval results found.</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Eval results ({data.length})</h2>
      <table className="w-full text-sm bg-white rounded border border-slate-200">
        <thead className="text-left bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="p-2">Model</th>
            <th className="p-2">Benchmark</th>
            <th className="p-2">Score</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={`${r.model_id}-${r.benchmark}-${i}`} className="border-b border-slate-100">
              <td className="p-2 font-mono">{r.model_id}</td>
              <td className="p-2">{r.benchmark}</td>
              <td className="p-2 font-mono">{(r.score * 100).toFixed(1)}%</td>
              <td className="p-2 text-slate-500">{new Date(r.timestamp).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

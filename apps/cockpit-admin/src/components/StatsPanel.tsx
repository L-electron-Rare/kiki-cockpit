import type { components } from '@cockpit/shared';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type DatasetStats = components['schemas']['DatasetStats'];

interface Props {
  stats: DatasetStats;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-slate-800 p-3 text-center">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 font-mono text-sm font-semibold text-violet-300">{value}</dd>
    </div>
  );
}

export function StatsPanel({ stats }: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-200">Quality Stats</h2>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Total samples" value={stats.total.toLocaleString('fr-FR')} />
        <StatCard label="User avg (chars)" value={stats.user_len_avg.toFixed(0)} />
        <StatCard label="Asst avg (chars)" value={stats.assistant_len_avg.toFixed(0)} />
        <StatCard label="Duplicate users" value={stats.duplicate_user_count} />
        <StatCard label="User p50" value={stats.user_len_p50} />
        <StatCard label="User p95" value={stats.user_len_p95} />
        <StatCard label="Asst p50" value={stats.assistant_len_p50} />
        <StatCard label="Asst p95" value={stats.assistant_len_p95} />
      </dl>

      {stats.length_buckets.length > 0 && (
        <div className="rounded border border-slate-700 bg-slate-900 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-300">
            Assistant length distribution (chars)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.length_buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="bucket" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #475569',
                  color: '#e2e8f0',
                }}
              />
              <Bar dataKey="count" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

import type { components } from '@cockpit/shared';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Metric = components['schemas']['TrainingMetric'];

interface Props {
  metrics: Metric[];
}

export function LossChart({ metrics }: Props) {
  if (metrics.length === 0) {
    return <p className="text-slate-500 italic">No data yet.</p>;
  }

  // Pivot: each iter shows train and/or val
  const byIter = new Map<number, { iter: number; train: number | null; val: number | null }>();
  for (const m of metrics) {
    const existing = byIter.get(m.iter) ?? { iter: m.iter, train: null, val: null };
    if (m.split === 'train') existing.train = m.loss;
    if (m.split === 'val') existing.val = m.loss;
    byIter.set(m.iter, existing);
  }
  const data = Array.from(byIter.values()).sort((a, b) => a.iter - b.iter);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="iter" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="train"
          stroke="#2563eb"
          name="Train loss"
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="val"
          stroke="#dc2626"
          name="Val loss"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

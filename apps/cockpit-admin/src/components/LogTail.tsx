import type { LogEvent } from '@/hooks/useTrainingLogs';
import { Copy, Search } from 'lucide-react';
import { useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

interface Props {
  events: LogEvent[];
}

export function LogTail({ events }: Props) {
  const [filter, setFilter] = useState('');

  const filtered = events.filter((e) => {
    if (!filter) return true;
    const text = e.raw ?? (e.metric ? JSON.stringify(e.metric) : (e.error ?? ''));
    try {
      return new RegExp(filter, 'i').test(text);
    } catch {
      return text.toLowerCase().includes(filter.toLowerCase());
    }
  });

  const copyAll = async () => {
    const text = filtered
      .map((e) => e.raw ?? (e.metric ? JSON.stringify(e.metric) : (e.error ?? '')))
      .join('\n');
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="rounded border border-slate-200 bg-slate-900 text-slate-100">
      <header className="flex items-center gap-2 border-b border-slate-700 p-2">
        <Search size={14} className="text-slate-400" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="regex filter…"
          className="flex-1 bg-transparent outline-none text-sm"
        />
        <button
          type="button"
          onClick={copyAll}
          className="text-xs flex items-center gap-1 hover:text-emerald-400"
        >
          <Copy size={12} /> Copy
        </button>
      </header>
      <Virtuoso
        style={{ height: 400 }}
        data={filtered}
        followOutput="smooth"
        itemContent={(_, ev) => <LogLine ev={ev} />}
      />
    </div>
  );
}

function LogLine({ ev }: { ev: LogEvent }) {
  if (ev.type === 'iter' && ev.metric) {
    const m = ev.metric;
    const color = m.split === 'train' ? 'text-blue-300' : 'text-rose-300';
    return (
      <div className={`px-2 py-0.5 font-mono text-xs ${color}`}>
        Iter {m.iter} [{m.split}] loss={m.loss.toFixed(4)}
        {m.lr != null && ` lr=${m.lr.toExponential(2)}`}
        {m.took_s != null && ` took=${m.took_s}s`}
      </div>
    );
  }
  if (ev.type === 'error') {
    return <div className="px-2 py-0.5 font-mono text-xs text-rose-400">[ERROR] {ev.error}</div>;
  }
  return <div className="px-2 py-0.5 font-mono text-xs text-slate-300">{ev.raw}</div>;
}

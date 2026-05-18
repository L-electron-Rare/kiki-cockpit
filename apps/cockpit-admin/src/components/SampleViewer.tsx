import type { components } from '@cockpit/shared';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { FlagButton } from './FlagButton';

type DatasetSample = components['schemas']['DatasetSample'];
type FlagItem = components['schemas']['Flag'];

interface PropsFixed {
  domain: string;
  samples: DatasetSample[];
  total: number;
  offset: number;
  pageSize: number;
  search: string;
  flags: FlagItem[];
  onOffsetChange: (offset: number) => void;
  onSearchChange: (search: string) => void;
  onFlag: (idx: number, reason: string) => void;
  onUnflag: (idx: number) => void;
  isLoading?: boolean;
}

export function SampleViewer({
  samples,
  total,
  offset,
  pageSize,
  search,
  flags,
  onOffsetChange,
  onSearchChange,
  onFlag,
  onUnflag,
  isLoading,
}: PropsFixed) {
  const [searchInput, setSearchInput] = useState(search);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    onSearchChange(searchInput);
    onOffsetChange(0);
  }

  const hasPrev = offset > 0;
  const hasNext = offset + pageSize < total;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-200">Samples</h2>
        <form onSubmit={submitSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search…"
              className="rounded border border-slate-600 bg-slate-800 py-1.5 pl-7 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            Search
          </button>
        </form>
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loading…</p>
      ) : samples.length === 0 ? (
        <p className="text-slate-400">No samples found.</p>
      ) : (
        <div className="space-y-3">
          {samples.map((sample, i) => {
            const sampleIdx = offset + i;
            return (
              <article
                key={sampleIdx}
                className="rounded-lg border border-slate-700 bg-slate-900 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">#{sampleIdx}</span>
                  <FlagButton idx={sampleIdx} flags={flags} onFlag={onFlag} onUnflag={onUnflag} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg rounded-tl-none bg-slate-700 px-3 py-2">
                      <p className="text-xs text-slate-400 mb-1">User</p>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">{sample.user}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg rounded-tr-none bg-violet-900/50 px-3 py-2">
                      <p className="text-xs text-violet-400 mb-1">Assistant</p>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">
                        {sample.assistant}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          {total === 0
            ? 'No results'
            : `${offset + 1}–${Math.min(offset + pageSize, total)} of ${total.toLocaleString('fr-FR')}`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}
            className="inline-flex items-center gap-1 rounded px-2 py-1 disabled:opacity-40 hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onOffsetChange(offset + pageSize)}
            className="inline-flex items-center gap-1 rounded px-2 py-1 disabled:opacity-40 hover:bg-slate-700"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

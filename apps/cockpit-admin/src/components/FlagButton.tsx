import type { components } from '@cockpit/shared';
import { Flag, FlagOff } from 'lucide-react';

type FlagItem = components['schemas']['Flag'];

interface Props {
  idx: number;
  flags: FlagItem[];
  onFlag: (idx: number, reason: string) => void;
  onUnflag: (idx: number) => void;
}

export function FlagButton({ idx, flags, onFlag, onUnflag }: Props) {
  const existing = flags.find((f) => f.idx === idx);

  function handleClick() {
    if (existing) {
      onUnflag(idx);
    } else {
      const reason = window.prompt(`Flag sample #${idx} — reason:`);
      if (reason?.trim()) {
        onFlag(idx, reason.trim());
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={existing ? `Flagged: ${existing.reason} — click to remove` : 'Flag this sample'}
      className={[
        'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition',
        existing
          ? 'bg-red-900/60 text-red-300 hover:bg-red-900'
          : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200',
      ].join(' ')}
    >
      {existing ? (
        <>
          <FlagOff className="h-3 w-3" />
          Flagged
        </>
      ) : (
        <>
          <Flag className="h-3 w-3" />
          Flag
        </>
      )}
    </button>
  );
}

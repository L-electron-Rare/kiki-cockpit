import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface ChatParams {
  temperature: number;
  max_tokens: number;
  system_prompt: string;
}

interface Props {
  value: ChatParams;
  onChange: (v: ChatParams) => void;
}

export function ParamsPanel({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-3 text-sm font-medium"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Parameters
      </button>
      {open && (
        <div className="p-3 border-t border-slate-200 space-y-3">
          <label className="block text-sm">
            Temperature: <span className="font-mono">{value.temperature.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={value.temperature}
              onChange={(e) => onChange({ ...value, temperature: Number(e.target.value) })}
              className="block w-full"
            />
          </label>
          <label className="block text-sm">
            Max tokens
            <input
              type="number"
              min={1}
              max={4096}
              value={value.max_tokens}
              onChange={(e) => onChange({ ...value, max_tokens: Number(e.target.value) })}
              className="block w-full rounded border border-slate-300 p-1 mt-1"
            />
          </label>
          <label className="block text-sm">
            System prompt
            <textarea
              rows={2}
              value={value.system_prompt}
              onChange={(e) => onChange({ ...value, system_prompt: e.target.value })}
              className="block w-full rounded border border-slate-300 p-1 mt-1"
            />
          </label>
        </div>
      )}
    </div>
  );
}

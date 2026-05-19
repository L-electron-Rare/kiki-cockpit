import { useState } from 'react';

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
    <div className="chat-params">
      <button
        type="button"
        className="chat-params-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="chat-params-caret">{open ? '−' : '+'}</span>
        Paramètres
      </button>
      {open && (
        <div className="chat-params-body">
          <label>
            <span>
              Température <b>{value.temperature.toFixed(2)}</b>
            </span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={value.temperature}
              onChange={(e) => onChange({ ...value, temperature: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>Max tokens</span>
            <input
              type="number"
              min={1}
              max={4096}
              value={value.max_tokens}
              onChange={(e) => onChange({ ...value, max_tokens: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>Prompt système</span>
            <textarea
              rows={2}
              value={value.system_prompt}
              onChange={(e) => onChange({ ...value, system_prompt: e.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

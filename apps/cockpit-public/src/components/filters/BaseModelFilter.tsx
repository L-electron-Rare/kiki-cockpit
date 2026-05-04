const BASES = [
  'mistral-large-123b',
  'qwen3.5-122b',
  'qwen3.5-35b',
  'apertus-70b',
  'devstral-24b',
  'eurollm-22b',
] as const;

interface Props {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}

export function BaseModelFilter({ value, onChange }: Props) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="rounded border border-slate-300 p-1 text-sm"
    >
      <option value="">All base models</option>
      {BASES.map((b) => (
        <option key={b} value={b}>
          {b}
        </option>
      ))}
    </select>
  );
}

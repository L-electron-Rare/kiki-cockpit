const DOMAINS = [
  'kicad',
  'stm32',
  'esp32',
  'platformio',
  'iot',
  'spice',
  'embedded',
  'dsp',
  'emc',
  'power',
  'freecad',
] as const;

interface Props {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}

export function DomainFilter({ value, onChange }: Props) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="rounded border border-slate-300 p-1 text-sm"
    >
      <option value="">All domains</option>
      {DOMAINS.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}

import { formatBytes, formatDownloads, formatParams } from '@cockpit/shared';
import type { components } from '@cockpit/shared';
import { Link } from '@tanstack/react-router';
import { Cpu, Download, HardDrive, Heart, MemoryStick, Scale, Server } from 'lucide-react';

type Card = components['schemas']['ModelCard'];

interface Props {
  card: Card;
}

export function ModelCard({ card }: Props) {
  const isLive = card.chat_eligible;
  const params = formatParams(card.parameters);
  const disk = formatBytes(card.disk_size_bytes);
  const memory = card.memory_gb ? `${card.memory_gb.toFixed(1)} GB` : null;
  const stats: Stat[] = [
    params && { icon: Cpu, label: 'params', value: params },
    disk && { icon: HardDrive, label: 'disk', value: disk },
    memory && { icon: MemoryStick, label: 'memory', value: memory },
    card.quantization && { icon: Scale, label: 'quant', value: card.quantization },
    card.host && { icon: Server, label: 'host', value: card.host },
  ].filter(Boolean) as Stat[];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-lg truncate">{card.display_name}</h3>
          <p className="text-xs text-slate-500 truncate">{card.id}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={card.status} />
          {card.kind && card.kind !== 'unknown' && <KindBadge kind={card.kind} />}
        </div>
      </header>

      {card.featured_headline && (
        <p className="mt-2 text-sm text-slate-700 italic">{card.featured_headline}</p>
      )}

      {card.description && (
        <p className="mt-2 text-sm text-slate-600 leading-snug">{card.description}</p>
      )}

      {(card.base_model || card.architecture || card.license) && (
        <p className="mt-2 text-xs text-slate-500 leading-snug">
          {card.base_model && (
            <>
              base: <span className="font-medium text-slate-700">{card.base_model}</span>
            </>
          )}
          {card.base_model && (card.architecture || card.license) && ' · '}
          {card.architecture && <span className="font-mono">{card.architecture}</span>}
          {card.architecture && card.license && ' · '}
          {card.license && <span>{card.license}</span>}
        </p>
      )}

      {stats.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-y-1 gap-x-2 text-xs text-slate-600">
          {stats.map((s) => (
            <li key={s.label} className="inline-flex items-center gap-1.5 truncate">
              <s.icon size={12} className="shrink-0 text-slate-400" />
              <span className="truncate" title={`${s.label}: ${s.value}`}>
                {s.value}
              </span>
            </li>
          ))}
        </ul>
      )}

      {card.top_eval_score != null && card.top_eval_benchmark && (
        <p className="mt-3 text-sm font-mono">
          {card.top_eval_benchmark}: {(card.top_eval_score * 100).toFixed(1)}%
        </p>
      )}

      <footer className="mt-auto pt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Download size={14} /> {formatDownloads(card.downloads)}
          </span>
          {card.likes > 0 && (
            <span className="inline-flex items-center gap-1">
              <Heart size={14} /> {card.likes}
            </span>
          )}
        </div>
        {isLive ? (
          <Link
            to="/chat/$owner/$name"
            params={{ owner: card.owner, name: card.name }}
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
          >
            Try
          </Link>
        ) : (
          <a
            href={card.hf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            HuggingFace
          </a>
        )}
      </footer>
    </article>
  );
}

interface Stat {
  icon: typeof Cpu;
  label: string;
  value: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    featured: 'bg-amber-100 text-amber-800',
    production: 'bg-emerald-100 text-emerald-800',
    alpha: 'bg-slate-100 text-slate-700',
    experimental: 'bg-purple-100 text-purple-800',
    deprecated: 'bg-rose-100 text-rose-700 line-through',
  };
  return (
    <span
      className={`text-xs rounded-full px-2 py-0.5 shrink-0 ${colors[status] ?? colors.production}`}
    >
      {status}
    </span>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const labels: Record<string, string> = {
    base: 'base',
    fine_tuned: 'fine-tune',
    lora: 'LoRA',
    quantized: 'quantized',
    distilled: 'distilled',
    merged: 'merged',
  };
  const colors: Record<string, string> = {
    base: 'bg-sky-100 text-sky-800',
    fine_tuned: 'bg-indigo-100 text-indigo-800',
    lora: 'bg-violet-100 text-violet-800',
    quantized: 'bg-cyan-100 text-cyan-800',
    distilled: 'bg-fuchsia-100 text-fuchsia-800',
    merged: 'bg-orange-100 text-orange-800',
  };
  if (!labels[kind]) return null;
  return (
    <span className={`text-[10px] rounded-full px-2 py-0.5 shrink-0 font-medium ${colors[kind]}`}>
      {labels[kind]}
    </span>
  );
}

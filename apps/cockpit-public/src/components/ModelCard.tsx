import { formatDownloads } from '@cockpit/shared';
import type { components } from '@cockpit/shared';
import { Link } from '@tanstack/react-router';
import { Download, Heart } from 'lucide-react';

type Card = components['schemas']['ModelCard'];

interface Props {
  card: Card;
}

export function ModelCard({ card }: Props) {
  const isLive = card.chat_eligible;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-lg">{card.display_name}</h3>
          <p className="text-xs text-slate-500">{card.id}</p>
        </div>
        <StatusBadge status={card.status} />
      </header>

      {card.featured_headline && (
        <p className="mt-2 text-sm text-slate-700 italic">{card.featured_headline}</p>
      )}

      {card.top_eval_score != null && card.top_eval_benchmark && (
        <p className="mt-2 text-sm font-mono">
          {card.top_eval_benchmark}: {(card.top_eval_score * 100).toFixed(1)}%
        </p>
      )}

      <footer className="mt-4 flex items-center justify-between text-sm">
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    featured: 'bg-amber-100 text-amber-800',
    production: 'bg-emerald-100 text-emerald-800',
    alpha: 'bg-slate-100 text-slate-700',
    experimental: 'bg-purple-100 text-purple-800',
    deprecated: 'bg-rose-100 text-rose-700 line-through',
  };
  return (
    <span className={`text-xs rounded-full px-2 py-0.5 ${colors[status] ?? colors.production}`}>
      {status}
    </span>
  );
}

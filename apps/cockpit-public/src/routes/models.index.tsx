import type { components } from '@cockpit/shared';
import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { useModels } from '@/hooks/useModels';

type ModelCard = components['schemas']['ModelCard'];

const searchSchema = z.object({
  domain: z.string().optional(),
  base: z.string().optional(),
  status: z.string().optional(),
});

export const Route = createFileRoute('/models/')({
  component: ModelsPage,
  validateSearch: searchSchema,
});

const KINDS = ['all', 'base', 'fine_tuned', 'lora', 'quantized', 'distilled'] as const;
const KIND_LABELS: Record<string, string> = {
  all: 'all',
  base: 'base',
  fine_tuned: 'fine-tune',
  lora: 'lora',
  quantized: 'quantized',
  distilled: 'distilled',
};

/** Inline card using styles.css design-token classes (avoids touching ModelCard.tsx). */
function ModelGridCard({ card }: { card: ModelCard }) {
  const isLive = card.chat_eligible;
  const badgeClass = card.status === 'featured' ? 'badge featured'
    : isLive ? 'badge live'
    : card.kind === 'lora' ? 'badge lora'
    : 'badge hf';
  const badgeLabel = card.status === 'featured' ? 'FEATURED'
    : isLive ? 'LIVE'
    : (card.kind ?? 'hf').toUpperCase();

  return (
    <article className="model">
      <div className="model-head">
        <div>
          <div className="model-id">{card.id}</div>
          <h3>{card.display_name}</h3>
        </div>
        <span className={badgeClass}>{badgeLabel}</span>
      </div>

      {card.featured_headline && (
        <p className="model-headline">{card.featured_headline}</p>
      )}

      <div className="model-stats">
        <div>
          <span className="k">base</span>
          <span className="v" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.base_model ?? '—'}
          </span>
        </div>
        <div>
          <span className="k">domain</span>
          <span className="v">{card.domain ?? '—'}</span>
        </div>
        <div>
          <span className="k">license</span>
          <span className="v">{card.license ?? '—'}</span>
        </div>
        <div>
          <span className="k">score</span>
          <span className="v">
            {card.top_eval_score != null
              ? `${(card.top_eval_score * 100).toFixed(1)}%`
              : '—'}
          </span>
        </div>
      </div>

      <div className="model-foot">
        <span>
          {card.downloads > 0
            ? `↓ ${(card.downloads / 1000).toFixed(1)}k`
            : 'interne'}
        </span>
        {isLive ? (
          <Link
            to="/models/$owner/$name"
            params={{ owner: card.owner, name: card.name }}
            className="model-try"
          >
            Essayer →
          </Link>
        ) : (
          <a
            href={card.hf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="model-try"
          >
            HuggingFace →
          </a>
        )}
      </div>
    </article>
  );
}

function ModelsPage() {
  const search = useSearch({ from: '/models/' });
  const navigate = useNavigate({ from: '/models/' });

  const { data, isLoading, error } = useModels({
    domain: search.domain,
    baseModel: search.base,
    status: search.status,
  });

  const [searchText, setSearchText] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');

  const cards = data ?? [];

  // Derive unique domains from loaded data for the domain chip-bar
  const domains = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => { if (c.domain) set.add(c.domain.split('/')[0] ?? c.domain); });
    return ['all', ...Array.from(set).sort()];
  }, [cards]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return cards.filter((c) => {
      if (kindFilter !== 'all' && c.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        c.id.toLowerCase().includes(q) ||
        c.display_name.toLowerCase().includes(q) ||
        (c.base_model ?? '').toLowerCase().includes(q)
      );
    });
  }, [cards, searchText, kindFilter]);

  const activeDomain = search.domain ?? 'all';

  const setDomain = (d: string) => {
    navigate({ search: { ...search, domain: d === 'all' ? undefined : d } });
  };

  if (isLoading) {
    return (
      <main>
        <section className="wrap page-head">
          <div className="kicker"><span className="num">№ 02</span> · catalogue</div>
          <h1 className="display">Modèles <em>servis</em> &amp; publiés.</h1>
        </section>
        <section className="wrap" style={{ padding: '48px 0' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-4)' }}>
            Chargement du catalogue…
          </p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <section className="wrap page-head">
          <div className="kicker"><span className="num">№ 02</span> · catalogue</div>
          <h1 className="display">Modèles <em>servis</em> &amp; publiés.</h1>
        </section>
        <section className="wrap" style={{ padding: '48px 0' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--bad)' }}>
            Erreur lors du chargement des modèles.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="wrap page-head">
        <div className="kicker"><span className="num">№ 02</span> · catalogue</div>
        <h1 className="display">Modèles <em>servis</em> &amp; publiés.</h1>
        <p style={{
          fontFamily: 'var(--serif)',
          fontSize: 22,
          lineHeight: 1.4,
          color: 'var(--ink-2)',
          maxWidth: '60ch',
          margin: '20px 0 0',
        }}>
          Workers répondent en SSE depuis l'infra. LoRA et distillations publiés sur
          HuggingFace. Chaque entrée pointe vers un fichier JSON Annex&nbsp;IV signé.
        </p>
      </section>

      <section className="wrap">
        {/* Kind + text search bar */}
        <div className="filter-bar">
          <input
            className="search-input"
            placeholder="rechercher par id, base, domaine…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {KINDS.map((k) => (
            <button
              key={k}
              className={'chip' + (kindFilter === k ? ' on' : '')}
              onClick={() => setKindFilter(k)}
            >
              {KIND_LABELS[k] ?? k}
            </button>
          ))}
        </div>

        {/* Domain chip bar */}
        <div className="filter-bar" style={{ borderBottom: '1px solid var(--rule)' }}>
          <span className="kicker" style={{ margin: 0, fontSize: 10 }}>domaine</span>
          {domains.map((d) => (
            <button
              key={d}
              className={'chip' + (activeDomain === d ? ' on' : '')}
              onClick={() => setDomain(d)}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '16px 0',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--ink-4)',
        }}>
          <span>{filtered.length} résultats sur {cards.length}</span>
          <span>tri : featured ↓</span>
        </div>

        {/* Grid */}
        <div className="models-grid">
          {filtered.map((card) => (
            <ModelGridCard key={card.id} card={card} />
          ))}
          {filtered.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              padding: '48px 0',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              color: 'var(--ink-4)',
              textAlign: 'center',
            }}>
              Aucun modèle ne correspond aux filtres.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

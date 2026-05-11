import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import catalog from '@/data/hf-catalog.json';

export const Route = createFileRoute('/catalog')({
  component: CatalogPage,
});

interface ModelEntry {
  modelId: string;
  org: string;
  lastModified: string | null;
  createdAt: string | null;
  downloads: number;
  likes: number;
  private: boolean;
  pipeline_tag: string | null;
  library_name: string | null;
  tags: string[];
}

interface Catalog {
  generated_at: string;
  orgs: Record<string, number>;
  models: ModelEntry[];
}

const data = catalog as Catalog;

const ORGS = ['all', 'electron-rare', 'Ailiance-fr'] as const;

function fmtDate(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('fr', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return s;
  }
}

function CatalogPage() {
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.models.filter((m) => {
      if (orgFilter !== 'all' && m.org !== orgFilter) return false;
      if (!q) return true;
      return (
        m.modelId.toLowerCase().includes(q) ||
        (m.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [orgFilter, search]);

  const erCount = data.orgs['electron-rare'] ?? 0;
  const aiCount = data.orgs['Ailiance-fr'] ?? 0;

  return (
    <main>
      <section className="wrap page-head">
        <div className="kicker">
          <span className="num">№ 02bis</span> · catalogue HuggingFace
        </div>
        <h1 className="display">
          Dépôts <em>publiés</em> sur HuggingFace.
        </h1>
        <p
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 22,
            lineHeight: 1.4,
            color: 'var(--ink-2)',
            maxWidth: '60ch',
            margin: '20px 0 0',
          }}
        >
          Source-of-truth des poids LoRA et modèles fine-tunés Ailiance, distribués
          publiquement sur HuggingFace. {erCount} dépôts <code>electron-rare</code>{' '}
          (production IP) et {aiCount} dépôts <code>Ailiance-fr</code> (fine-tunes
          mascarade, devstral, gemma-4, apertus, eurollm).
        </p>
      </section>

      <section className="wrap">
        <div className="filter-bar">
          <input
            className="search-input"
            placeholder="rechercher par id ou tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {ORGS.map((o) => (
            <button
              key={o}
              type="button"
              className={'chip' + (orgFilter === o ? ' on' : '')}
              onClick={() => setOrgFilter(o)}
            >
              {o === 'all' ? `all (${erCount + aiCount})` : `${o} (${data.orgs[o] ?? 0})`}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '16px 0',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--ink-4)',
          }}
        >
          <span>
            {filtered.length} résultats sur {data.models.length}
          </span>
          <span>snapshot {fmtDate(data.generated_at)}</span>
        </div>

        <div style={{ overflowX: 'auto', borderTop: '1px solid var(--rule)' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--mono)',
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <th style={thStyle}>Dépôt</th>
                <th style={thStyle}>Org</th>
                <th style={thStyle}>Pipeline</th>
                <th style={thStyle}>Tags</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Maj</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>↓</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>♥</th>
                <th style={thStyle}>Lien</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.modelId}
                  style={{ borderBottom: '1px solid var(--rule-soft, var(--rule))' }}
                >
                  <td style={tdStyle}>
                    <code style={{ fontSize: 12 }}>{m.modelId}</code>
                  </td>
                  <td style={tdStyle}>
                    <span className={'badge ' + (m.org === 'electron-rare' ? 'hf' : 'lora')}>
                      {m.org}
                    </span>
                  </td>
                  <td style={tdStyle}>{m.pipeline_tag ?? '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: 320 }}>
                    {(m.tags ?? []).slice(0, 4).map((t) => (
                      <span
                        key={t}
                        style={{
                          display: 'inline-block',
                          marginRight: 4,
                          fontSize: 10,
                          color: 'var(--ink-3)',
                          padding: '1px 4px',
                          border: '1px solid var(--rule)',
                          borderRadius: 2,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {fmtDate(m.lastModified)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {m.downloads > 0 ? m.downloads : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {m.likes > 0 ? m.likes : '—'}
                  </td>
                  <td style={tdStyle}>
                    <a
                      href={`https://huggingface.co/${m.modelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="model-try"
                    >
                      HF →
                    </a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: '48px 0',
                      textAlign: 'center',
                      color: 'var(--ink-4)',
                    }}
                  >
                    Aucun dépôt ne correspond aux filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--ink-4)',
  fontWeight: 600,
};

const tdStyle: CSSProperties = {
  padding: '8px',
  verticalAlign: 'top',
};

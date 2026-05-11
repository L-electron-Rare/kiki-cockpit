import { ChatPlayground } from '@/components/ChatPlayground/ChatPlayground';
import { useModels } from '@/hooks/useModels';
import type { components } from '@cockpit/shared';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';

type ModelCard = components['schemas']['ModelCard'];

export const Route = createFileRoute('/models/')({
  component: ModelsPage,
});

// Mini fleet panel — single source of truth for status while /api/public/status n'est pas câblé.
const FLEET = [
  { id: 'ailiance/apertus-70b', host: 'studio', port: 9301, role: 'souverain', up: true },
  { id: 'ailiance/devstral-24b', host: 'macm1', port: 9302, role: 'code', up: true },
  { id: 'ailiance/eurollm-22b', host: 'studio', port: 9303, role: 'multilingue', up: true },
  { id: 'ailiance/gemma3-4b', host: 'tower', port: 9304, role: 'fallback', up: true },
  { id: 'ailiance/qwen3-next-80b', host: 'kxkm-ai', port: 8002, role: 'raisonnement', up: true },
];

// Bench origine vs tuné — extrait iact-bench v0.2.0. À remplacer par fetch /api/public/bench plus tard.
const BENCH = [
  { domain: 'KiCad DSL', origin: 12, tuned: 67, model: 'ailiance/auto' },
  { domain: 'KiCad PCB', origin: 18, tuned: 60, model: 'ailiance/auto' },
  { domain: 'SPICE simulation', origin: 21, tuned: 46, model: 'ailiance/auto' },
  { domain: 'STM32 embedded', origin: 28, tuned: 71, model: 'ailiance/auto' },
  { domain: 'EMC analysis', origin: 24, tuned: 58, model: 'ailiance/auto' },
  { domain: 'Power electronics', origin: 31, tuned: 64, model: 'ailiance/auto' },
];

function ModelGridCard({ card }: { card: ModelCard }) {
  const isLive = card.chat_eligible;
  return (
    <article className="model">
      <div className="model-head">
        <div>
          <div className="model-id">{card.id}</div>
          <h3>{card.display_name}</h3>
        </div>
        <span className={isLive ? 'badge live' : 'badge featured'}>
          {isLive ? 'LIVE' : 'FEATURED'}
        </span>
      </div>
      {card.featured_headline && <p className="model-headline">{card.featured_headline}</p>}
      <div className="model-stats">
        <div>
          <span className="k">base</span>
          <span className="v" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.base_model ?? '—'}
          </span>
        </div>
        <div>
          <span className="k">quant</span>
          <span className="v">{card.quantization ?? '—'}</span>
        </div>
        <div>
          <span className="k">host</span>
          <span className="v">{card.host?.split('.')[0] ?? '—'}</span>
        </div>
        <div>
          <span className="k">score</span>
          <span className="v">
            {card.top_eval_score != null ? `${(card.top_eval_score * 100).toFixed(1)}%` : '—'}
          </span>
        </div>
      </div>
      <div className="model-foot">
        <span>{card.top_eval_benchmark ?? 'iact-bench'}</span>
        {isLive ? (
          <Link
            to="/models/$owner/$name"
            params={{ owner: card.owner, name: card.name }}
            className="model-try"
          >
            Annex IV →
          </Link>
        ) : (
          <a href={card.hf_url} target="_blank" rel="noopener noreferrer" className="model-try">
            HuggingFace →
          </a>
        )}
      </div>
    </article>
  );
}

function ModelsPage() {
  const { data, isLoading, error } = useModels();
  const cards = data ?? [];

  // Modèles finaux uniquement : chat_eligible OU status === 'featured' OU id contient '/auto'
  const finalModels = useMemo(
    () =>
      cards
        .filter(
          (c) =>
            c.chat_eligible ||
            c.status === 'featured' ||
            c.id.endsWith('/auto') ||
            c.id.endsWith('/ailiance'),
        )
        .sort((a, b) => (a.featured_rank ?? 999) - (b.featured_rank ?? 999)),
    [cards],
  );

  const upCount = FLEET.filter((b) => b.up).length;

  return (
    <main>
      <section className="wrap page-head">
        <div className="kicker">
          <span className="num">№ 02</span> · modèles servis
        </div>
        <h1 className="display">
          Modèles <em>finaux</em> &amp; auto-router.
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
          Les workers actifs, l'auto-router agentique, le statut de la flotte, les scores bench
          origine vs tuné, le chemin d'une requête, et le playground — sur une seule page.
        </p>
      </section>

      {/* Auto-router showcase */}
      <section className="wrap block">
        <div className="block-head">
          <h2>
            Auto-router <code className="mono">model: "ailiance"</code>.
          </h2>
          <p className="lede">
            Un seul alias. Le routeur classifie 32 domaines (embeddings Jina v3 + classifier MLP),
            applique une politique YAML par domaine, et fait passer la sortie dans un validator
            sandboxé sur les domaines hardware / code.
          </p>
        </div>
      </section>

      {/* Chemin de la requête */}
      <section className="wrap block">
        <div className="block-head">
          <h2>Le chemin d'une requête.</h2>
          <p className="lede">
            Une requête <code className="mono">POST /api/public/chat</code> traverse exactement six
            étapes avant de rentrer en SSE — sandbox validator inclus pour les domaines hardware.
          </p>
        </div>
        <pre className="ascii">{`
   ┌────────┐         ┌──────────┐         ┌─────────────┐         ┌──────────────────┐
   │  user  │ ──HTTPS─│Cloudflare│──HTTPS──│   Traefik   │ ──HTTP──│  ailiance-demo   │
   └────────┘         └──────────┘         │ ratelimit 30│         │  /api/public/chat│
                                            │   req/min   │         │  slowapi 30/min  │
                                            └─────────────┘         └────────┬─────────┘
                                                                             │
                                                                             ▼
   ┌────────────────────────────────────────────────────────────────────────────┐
   │                ailiance gateway · :9300 · router v0.3                      │
   │                                                                            │
   │   classify → policy → llm → validator (sandboxed) → reflector → return     │
   └─────────────┬──────────────────────┬───────────────────┬───────────────────┘
                 ▼                      ▼                   ▼
          ┌──────────────┐       ┌──────────────┐    ┌──────────────┐
          │   studio     │       │    macm1     │    │   kxkm-ai    │
          │ apertus 70B  │       │ devstral 24B │    │ qwen3 80B    │
          │ eurollm 22B  │       │              │    │  (autossh)   │
          └──────────────┘       └──────────────┘    └──────────────┘
`}</pre>
      </section>

      {/* Statut intégré — gateway + backends UP/DOWN */}
      <section className="wrap block">
        <div className="block-head">
          <h2>Statut de la flotte.</h2>
          <p className="lede">
            Gateway et workers actifs.{' '}
            <strong>
              {upCount} / {FLEET.length}
            </strong>{' '}
            healthy. Refresh manuel — pour la page complète d'observabilité voir le dossier Annex
            IV.
          </p>
        </div>
        <div className="fleet">
          <div className="fleet-head">
            <span className="live">
              <span className="dot" /> gateway :9300 · router v0.3
            </span>
            <span>
              {upCount} / {FLEET.length} healthy
            </span>
          </div>
          {FLEET.map((w) => (
            <div className="worker-row" key={w.id}>
              <span className="dot" style={{ background: w.up ? 'var(--ok)' : 'var(--bad)' }} />
              <div>
                <div className="id">{w.id}</div>
                <div className="host">
                  {w.host}:{w.port}
                </div>
              </div>
              <div>
                <div className="label">role</div>
                <div className="val">{w.role}</div>
              </div>
              <div>
                <div className="label">état</div>
                <div className="val">{w.up ? 'UP' : 'DOWN'}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bench origine vs tuné */}
      <section className="wrap block">
        <div className="block-head">
          <h2>
            Bench — origine <em>vs</em> tuné.
          </h2>
          <p className="lede">
            iact-bench v0.2.0, sandbox Docker épinglé par digest. Score = % cellules avec validator
            exit-zéro. Origine = modèle base sans routage. Tuné = via auto-router + validator chain.
          </p>
        </div>
        <table className="prov-table">
          <thead>
            <tr>
              <th>Domaine</th>
              <th style={{ textAlign: 'right' }}>Origine</th>
              <th style={{ textAlign: 'right' }}>Tuné</th>
              <th style={{ textAlign: 'right' }}>Δ</th>
              <th>Modèle</th>
            </tr>
          </thead>
          <tbody>
            {BENCH.map((b) => {
              const delta = b.tuned - b.origin;
              return (
                <tr key={b.domain}>
                  <td>{b.domain}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{b.origin}%</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>{b.tuned}%</td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'var(--mono)',
                      color: delta > 0 ? 'var(--ok)' : 'var(--bad)',
                    }}
                  >
                    +{delta}
                  </td>
                  <td>
                    <code>{b.model}</code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p
          style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-4)', marginTop: 16 }}
        >
          Source :{' '}
          <a
            href="https://github.com/electron-rare/iact-bench"
            target="_blank"
            rel="noopener noreferrer"
          >
            iact-bench
          </a>{' '}
          · seed crc32(domaine + index) · digest validator sha256 épinglé
        </p>
      </section>

      {/* Grid des modèles finaux */}
      <section className="wrap block">
        <div className="block-head">
          <h2>Catalogue final.</h2>
          <p className="lede">
            Les workers actifs (LIVE) et les références featured du catalogue. Pour le catalogue
            HuggingFace complet (24 adaptateurs), voir la model card de chaque entrée.
          </p>
        </div>
        {isLoading ? (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-4)' }}>
            Chargement…
          </p>
        ) : error ? (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--bad)' }}>
            Erreur de chargement.
          </p>
        ) : (
          <div className="models-grid">
            {finalModels.map((card) => (
              <ModelGridCard key={card.id} card={card} />
            ))}
            {finalModels.length === 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '48px 0',
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  color: 'var(--ink-4)',
                  textAlign: 'center',
                }}
              >
                Aucun modèle final.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Playground intégré — auto-router preset */}
      <section className="wrap block">
        <div className="block-head">
          <h2>Playground — auto-router.</h2>
          <p className="lede">
            Le playground utilise l'alias <code className="mono">ailiance</code> (auto-router) par
            défaut. Pour tester un modèle spécifique, ouvrez sa fiche depuis le catalogue ci-dessus.
            30 requêtes / minute / IP, sans inscription ni clé d'API.
          </p>
        </div>
        <ChatPlayground modelId="ailiance" modelDisplayName="Auto-router · ailiance" />
      </section>
    </main>
  );
}

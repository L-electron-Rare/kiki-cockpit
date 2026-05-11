import { ChatPlayground } from '@/components/ChatPlayground/ChatPlayground';
import { useModels } from '@/hooks/useModels';
import { useStatus } from '@/hooks/useStatus';
import type { components } from '@cockpit/shared';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';

type ModelCard = components['schemas']['ModelCard'];

export const Route = createFileRoute('/models/')({
  component: ModelsPage,
});

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

  const { data: status, isLoading: statusLoading, error: statusError } = useStatus();
  const workers = status?.workers ?? [];
  const upCount = status?.healthy_count ?? 0;
  const totalCount = status?.total_count ?? workers.length;

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

      {/* Auto-router par domaine — flow moderne */}
      <section className="wrap block">
        <div className="block-head">
          <h2>L'auto-router, par domaine.</h2>
          <p className="lede">
            Le prompt entre. Un classifier embeddings le situe sur l'un des 32 domaines. Le routeur
            ouvre la politique YAML correspondante et choisit le spécialiste. Sur les domaines
            hardware, la sortie passe par un validator Docker sandboxé avant retour utilisateur.
          </p>
        </div>

        <div className="router-flow">
          <RouterStep
            num="1"
            title="Prompt utilisateur"
            sub="« Génère le schéma KiCad d'un convertisseur boost 12V→24V »"
            tone="muted"
          />
          <RouterArrow label="POST /api/public/chat" />
          <RouterStep
            num="2"
            title="Classifier Jina v3 + MLP"
            sub="32 domaines prédits · cache L1 hash + L2 cosinus sémantique"
            tone="accent"
            chips={['kicad', 'spice', 'stm32', 'emc', 'embedded', 'code', 'math', '…']}
          />
          <RouterArrow label="domaine ∈ HARDWARE_DOMAINS ?" />
          <div className="router-branch">
            <div className="router-branch-col">
              <span className="kicker" style={{ margin: '0 0 8px' }}>
                Branche hardware
              </span>
              <RouterStep
                num="3a"
                title="Spécialiste mascarade-*"
                sub="LoRA Qwen3-4B fine-tunée sur le domaine (kicad / spice / stm32 / emc / embedded / power…) · Tower Ollama :8004"
                tone="hardware"
              />
              <RouterArrow label="sortie LLM" small />
              <RouterStep
                num="4a"
                title="Validator Docker sandboxé"
                sub="--network=none --read-only --cap-drop=ALL · KiCad DRC, ngspice, g++, shellcheck, tsc, FreeCAD scripting…"
                tone="validator"
              />
              <RouterArrow label="exit ≠ 0 → reflector retry" small />
            </div>
            <div className="router-branch-col">
              <span className="kicker" style={{ margin: '0 0 8px' }}>
                Branche directe
              </span>
              <RouterStep
                num="3b"
                title="Backend généraliste"
                sub="Apertus 70B (souverain) · Qwen3-Next 80B (raisonnement) · EuroLLM 22B (multilingue) · Devstral 24B (code) · Gemma 4 (fallback)"
                tone="direct"
              />
              <RouterArrow label="sortie directe" small />
              <div className="router-step ghost">
                <div className="num">—</div>
                <div>
                  <div className="title">Pas de validator</div>
                  <div className="sub">
                    Math, traduction et généraliste restent en politique <code>direct</code>{' '}
                    (1-shot).
                  </div>
                </div>
              </div>
            </div>
          </div>
          <RouterArrow label="NDJSON audit trail · SSE retour utilisateur" />
          <RouterStep
            num="5"
            title="Réponse streamée à l'utilisateur"
            sub="Audit-grade : prompt_hash, output_hash, seed, validator_image_digest tous loggés en NDJSON pour rejouabilité Annex IV"
            tone="muted"
          />
        </div>
      </section>

      {/* Statut intégré — live fetch /api/public/status, refresh 15s */}
      <section className="wrap block">
        <div className="block-head">
          <h2>Statut de la flotte.</h2>
          <p className="lede">
            Gateway et workers actifs, sondés en direct via{' '}
            <code className="mono">/api/public/status</code> toutes les 15 secondes.{' '}
            {statusLoading ? (
              <em>chargement…</em>
            ) : statusError ? (
              <em>probe indisponible</em>
            ) : (
              <>
                <strong>
                  {upCount} / {totalCount}
                </strong>{' '}
                healthy.
              </>
            )}
          </p>
        </div>
        <div className="fleet">
          <div className="fleet-head">
            <span className="live">
              <span className="dot" /> gateway :9300 · router v0.3 · live probe
            </span>
            <span>
              {upCount} / {totalCount} healthy
            </span>
          </div>
          {workers.map((w) => (
            <div className="worker-row" key={w.id}>
              <span
                className="dot"
                style={{ background: w.healthy ? 'var(--ok)' : 'var(--bad)' }}
              />
              <div>
                <div className="id">{w.label}</div>
                <div className="host">
                  {w.host} · {w.id}
                </div>
              </div>
              <div>
                <div className="label">latence</div>
                <div className="val tnum">
                  {w.latency_ms != null ? `${w.latency_ms.toFixed(0)} ms` : '—'}
                </div>
              </div>
              <div>
                <div className="label">uptime</div>
                <div className="val tnum">
                  {w.uptime_s > 0 ? `${Math.floor(w.uptime_s / 3600)} h` : '—'}
                </div>
              </div>
              <div>
                <div className="label">état</div>
                <div className="val" style={{ color: w.healthy ? 'var(--ok)' : 'var(--bad)' }}>
                  {w.healthy ? 'UP' : 'DOWN'}
                </div>
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
            href="https://github.com/ailiance/iact-bench"
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

type StepTone = 'muted' | 'accent' | 'hardware' | 'validator' | 'direct';

function RouterStep({
  num,
  title,
  sub,
  tone = 'muted',
  chips,
}: {
  num: string;
  title: string;
  sub: string;
  tone?: StepTone;
  chips?: string[];
}) {
  return (
    <div className={`router-step tone-${tone}`}>
      <div className="num">{num}</div>
      <div className="body">
        <div className="title">{title}</div>
        <div className="sub">{sub}</div>
        {chips && (
          <div className="chips">
            {chips.map((c) => (
              <span key={c} className="chip-sm">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RouterArrow({ label, small }: { label: string; small?: boolean }) {
  return (
    <div className={`router-arrow${small ? ' small' : ''}`}>
      <span className="line" />
      <span className="label">{label}</span>
      <span className="head" aria-hidden>
        ▾
      </span>
    </div>
  );
}

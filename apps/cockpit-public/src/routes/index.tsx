import { useModels } from '@/hooks/useModels';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

// TODO: wire to /api/public/status (WorkerStatus[])
const FLEET_MOCK = [
  { id: 'ailiance/apertus-70b',    host: 'studio.tail',  port: 9301, quant: 'bf16 MLX',      memory: '138 GB', latency: 312, role: 'souverain'    },
  { id: 'ailiance/devstral-24b',   host: 'macm1.tail',   port: 9302, quant: 'Q5_K_M GGUF',   memory: '22 GB',  latency: 188, role: 'code'          },
  { id: 'ailiance/eurollm-22b',    host: 'studio.tail',  port: 9303, quant: 'bf16 MLX',      memory: '44 GB',  latency: 224, role: 'multilingue'   },
  { id: 'ailiance/gemma3-4b',      host: 'tower.tail',   port: 9304, quant: 'Q6_K GGUF',     memory: '3.8 GB', latency: 92,  role: 'fallback'      },
  { id: 'ailiance/qwen3-next-80b', host: 'kxkm-ai.tail', port: 8002, quant: 'Q4_K_M MoE',    memory: '48 GB',  latency: 421, role: 'raisonnement'  },
];

const PILLARS = [
  { num: 'I',   t: 'Souveraineté matérielle', d: 'Apple Silicon, Quadro, RTX 4090 — physiquement en France, exposés par tailnet, jamais sur un cloud public.', tag: 'ON-PREM'    },
  { num: 'II',  t: 'Provenance par défaut',   d: 'Chaque modèle servi expose son JSON Annex IV : SHA upstream, méthode d\'entraînement, licence, hyperparamètres, sandbox de validation.', tag: 'ANNEX IV'  },
  { num: 'III', t: 'Routage agentique v0.3',  d: 'Le routeur classifie 32 domaines, applique une politique YAML, et passe la sortie dans un validator sandboxé (Docker --network=none).', tag: 'DELIBERATE' },
  { num: 'IV',  t: 'Audit-grade benchmark',   d: 'iact-bench v0.2.0 : 31 domaines × 23 modèles, 25 validators Docker épinglés par digest. Reproductible byte-à-byte.', tag: 'REPRO'     },
];

/** Inline sparkline — 14 deterministic bars derived from seed */
function Spark({ seed, n = 14 }: { seed: number; n?: number }) {
  const heights = Array.from({ length: n }, (_, i) => {
    const v = Math.abs(Math.sin((i + seed) * 2.3)) * 14 + 2;
    return Math.round(v);
  });
  return (
    <span className="spark" style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
      {heights.map((h, i) => (
        <i key={i} style={{ width: 3, height: h, background: 'var(--ink-3)', display: 'block' }} />
      ))}
    </span>
  );
}

/** France provenance stamp */
function FranceStamp() {
  return (
    <span className="france-stamp">
      <span className="flag">
        <i /><i /><i />
      </span>
      Servi depuis la France · Beaujolais
    </span>
  );
}

function HomePage() {
  const { data: all, isLoading } = useModels();

  // Featured = live models sorted by featured_rank, max 5
  const featured = (all ?? [])
    .filter((c) => c.chat_eligible)
    .sort((a, b) => (a.featured_rank ?? 999) - (b.featured_rank ?? 999))
    .slice(0, 5);

  return (
    <div style={{ margin: '0 calc(-1 * var(--pad))' }}>

      {/* Hero */}
      <section className="wrap hero">
        <div>
          <div className="kicker"><span className="num">№ 01</span> · vitrine publique · ailiance.fr</div>
          <h1>
            Une flotte LLM <em>souveraine</em>,<br />
            servie depuis le Beaujolais,<br />
            <span className="stk">pas</span> depuis un cloud.
          </h1>
          <div className="hero-cta">
            <Link to="/models" className="btn">
              Ouvrir le playground <ArrowRight />
            </Link>
            <Link to="/models" className="btn ghost">Parcourir les modèles</Link>
            <Link to="/transparency" className="btn ghost">Dossier AI Act</Link>
          </div>
        </div>
        <div>
          <p className="hero-lede">
            Cinq workers actifs. Vingt-quatre adaptateurs publiés sur HuggingFace. Un dossier de
            provenance Annex IV par référence — signé, daté, et reproductible byte-à-byte par un
            auditeur externe.
          </p>
          <div className="hero-meta">
            <div><span>5</span> workers · <span>24</span> LoRA publics · <span>31</span> domaines évalués</div>
            <div><span>0</span> dépendance cloud · <span>0</span> log de prompt persisté</div>
            <div>EU AI Act <span>Article 50, 53, Annex IV §1(c)</span></div>
          </div>
          <div style={{ marginTop: 28 }}><FranceStamp /></div>
        </div>
      </section>

      {/* Live fleet panel */}
      <section className="wrap" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="fleet">
          <div className="fleet-head">
            <span className="live"><span className="dot" /> /api/public/status · refresh 15 s</span>
            <span>5 / 5 healthy</span>
          </div>
          {FLEET_MOCK.map((w, i) => (
            <div className="worker-row" key={w.id}>
              <span className="dot" />
              <div>
                <div className="id">{w.id}</div>
                <div className="host">{w.host}:{w.port} · {w.quant}</div>
              </div>
              <div>
                <div className="label">latency</div>
                <div className="val tnum">{w.latency} ms</div>
              </div>
              <div>
                <div className="label">memory</div>
                <div className="val">{w.memory}</div>
              </div>
              <div>
                <div className="label">role</div>
                <div className="val">{w.role}</div>
              </div>
              <Spark seed={i + 3} />
            </div>
          ))}
        </div>
      </section>

      {/* Four pillars */}
      <section className="wrap block">
        <div className="block-head">
          <h2>Le manifeste<br />en quatre points.</h2>
          <p className="lede">
            Pourquoi exploiter cinq workers sur du matériel personnel quand un appel d'API suffirait ?
            Parce qu'il existe encore un standard plus exigeant que la latence : la <em>traçabilité</em>.
          </p>
        </div>
        <div className="pillars">
          {PILLARS.map((p) => (
            <div className="pillar" key={p.num}>
              <span className="num">№ {p.num}</span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
              <span className="tag">{p.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured models */}
      <section className="wrap block">
        <div className="block-head">
          <h2>Featured — les modèles servis <em>live</em>.</h2>
          <p className="lede">
            Cinq workers répondent à{' '}
            <code className="mono">POST /api/public/chat</code> en SSE. Le bouton{' '}
            <strong>Essayer</strong> ouvre le playground sans inscription, sans clé d'API, sans
            tracking — limité à 30 requêtes par minute par IP.
          </p>
        </div>
        <div className="models-grid">
          {isLoading ? (
            <div className="model" style={{ gridColumn: '1/-1', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
              <span className="muted mono" style={{ fontSize: 12 }}>chargement…</span>
            </div>
          ) : (
            <>
              {featured.map((w) => (
                <Link
                  key={w.id}
                  to="/chat/$owner/$name"
                  params={{ owner: w.owner, name: w.name }}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <article className="model">
                    <div className="model-head">
                      <div>
                        <div className="model-id">{w.id}</div>
                        <h3>{w.display_name}</h3>
                      </div>
                      <span className="badge live">LIVE</span>
                    </div>
                    {w.featured_headline && (
                      <p className="model-headline">{w.featured_headline}</p>
                    )}
                    <div className="model-stats">
                      {w.base_model && (
                        <div><span className="k">base</span><span className="v">{w.base_model}</span></div>
                      )}
                      {w.quantization && (
                        <div><span className="k">quant</span><span className="v">{w.quantization}</span></div>
                      )}
                      {w.memory_gb && (
                        <div><span className="k">mem</span><span className="v">{w.memory_gb.toFixed(0)} GB</span></div>
                      )}
                      {w.host && (
                        <div><span className="k">host</span><span className="v">{w.host.split('.')[0]}</span></div>
                      )}
                    </div>
                    <div className="model-foot">
                      {w.top_eval_benchmark && w.top_eval_score != null ? (
                        <span>{w.top_eval_benchmark} {(w.top_eval_score * 100).toFixed(1)}%</span>
                      ) : (
                        <span />
                      )}
                      <span className="model-try">Essayer <ArrowRight size={12} /></span>
                    </div>
                  </article>
                </Link>
              ))}
              {/* Catalogue HuggingFace card — always shown */}
              <Link to="/models" style={{ textDecoration: 'none' }}>
                <article
                  className="model"
                  style={{ background: 'var(--ink)', color: 'var(--paper)' }}
                >
                  <div className="model-head">
                    <div>
                      <div className="model-id" style={{ color: 'var(--paper)' }}>+ 24 adaptateurs</div>
                      <h3 style={{ color: 'var(--paper)' }}>Catalogue HuggingFace</h3>
                    </div>
                    <span className="badge hf" style={{ color: 'var(--paper)', borderColor: 'var(--paper)' }}>HF</span>
                  </div>
                  <p className="model-headline" style={{ color: '#c6c1b3' }}>
                    KiCad, ngspice, droit français, médical EU, embedded Rust, math olympiad — LoRA
                    et distillations publiées sous Apache-2.0.
                  </p>
                  <div className="model-foot" style={{ borderTopColor: '#3a3733', color: '#8a8579' }}>
                    <span>24 modèles · 31 domaines</span>
                    <span className="model-try" style={{ color: 'var(--paper)' }}>Catalogue <ArrowRight size={12} /></span>
                  </div>
                </article>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Architecture diagram */}
      <section className="wrap block">
        <div className="block-head">
          <h2>Le chemin d'une requête.</h2>
          <p className="lede">
            Une requête <code className="mono">POST /api/public/chat</code> traverse exactement six
            étapes avant de rentrer en SSE. Voici lesquelles, dans l'ordre, avec le bout de code
            responsable de chacune.
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

      {/* CTA strip — negative margin to achieve full-width background */}
      <section
        style={{
          background: 'var(--paper-2)',
          padding: '64px var(--pad)',
          marginLeft: 0,
          marginRight: 0,
        }}
      >
        <div className="wrap" style={{ padding: 0 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 48,
              alignItems: 'end',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(40px, 5vw, 64px)',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
                fontWeight: 400,
                margin: 0,
              }}
            >
              Tout le code, <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>tous les poids</em>, toutes les politiques — sur GitHub.
            </h2>
            <div>
              <p style={{ color: 'var(--ink-3)', fontSize: 17, lineHeight: 1.5, margin: '0 0 24px' }}>
                <code className="mono">L-electron-Rare/ailiance</code> contient la gateway, le
                router, les politiques de chaîne et le dossier de transparence.{' '}
                <code className="mono">ailiance-demo</code> contient ce site. Les LoRA et
                distillations sont sur HuggingFace. Tout sous Apache-2.0.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <a
                  className="btn"
                  href="https://github.com/L-electron-Rare/ailiance"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Voir sur GitHub
                </a>
                <a
                  className="btn ghost"
                  href="https://huggingface.co/clemsail"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  HuggingFace
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

/** Minimal inline arrow icon — avoids lucide import just for this shape */
function ArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

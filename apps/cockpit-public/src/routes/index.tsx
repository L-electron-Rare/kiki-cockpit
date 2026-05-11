import { useModels } from '@/hooks/useModels';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

const MISSIONS = [
  {
    num: 'I',
    t: 'Frameworks spécialisés',
    d: "Mise à disposition de modèles d'entraînement spécialisés par domaine (KiCad, ngspice, embarqué, droit, médical, math). LoRA et distillations publiés sous Apache-2.0.",
    tag: 'OPEN-WEIGHTS',
  },
  {
    num: 'II',
    t: "Aide à l'implémentation",
    d: 'Accompagnement technique pour intégrer la flotte LLM ou un sous-ensemble (gateway, routeur, validators) dans votre infrastructure existante. On-prem, hybride ou cloud privé.',
    tag: 'INTÉGRATION',
  },
  {
    num: 'III',
    t: 'Formation',
    d: "Sessions sur le routage agentique, le fine-tuning LoRA sur Apple Silicon, l'évaluation audit-grade et la conformité AI Act — équipes data, conformité, intégrateurs.",
    tag: 'TRANSFERT',
  },
  {
    num: 'IV',
    t: 'Schémas PCB',
    d: 'Création de schémas électroniques et mises en page PCB sous KiCad, validés par notre chaîne LLM + validators sandboxés (DRC, ERC, ngspice). De la napkin sketch au gerber.',
    tag: 'HARDWARE',
  },
];

function FranceStamp() {
  return (
    <span className="france-stamp">
      <span className="flag">
        <i />
        <i />
        <i />
      </span>
      Servi depuis la France · Beaujolais
    </span>
  );
}

function HomePage() {
  const { data: all, isLoading } = useModels();

  // Featured = live models sorted by featured_rank, max 6 (single presentation)
  const featured = (all ?? [])
    .filter((c) => c.chat_eligible)
    .sort((a, b) => (a.featured_rank ?? 999) - (b.featured_rank ?? 999))
    .slice(0, 6);

  return (
    <div style={{ margin: '0 calc(-1 * var(--pad))' }}>
      {/* Hero — onglets/CTA retirés (déjà dans le header) */}
      <section className="wrap hero">
        <div>
          <div className="kicker">
            <span className="num">№ 01</span> · vitrine publique · ailiance.fr
          </div>
          <h1>
            Une flotte LLM <em>souveraine</em>,<br />
            servie depuis le Beaujolais,
            <br />
            <span className="stk">pas</span> depuis un cloud.
          </h1>
        </div>
        <div>
          <p className="hero-lede">
            Frameworks de modèles spécialisés, aide à l'implémentation, formation et création de
            schémas PCB — opérés depuis du matériel personnel en France, sous Apache-2.0.
          </p>
          <div className="hero-meta">
            <div>
              <span>5</span> workers · <span>24</span> LoRA publics · <span>31</span> domaines
              évalués
            </div>
            <div>
              <span>0</span> dépendance cloud · <span>0</span> log de prompt persisté
            </div>
            <div>
              EU AI Act <span>Article 50, 53, Annex IV §1(c)</span>
            </div>
          </div>
          <div style={{ marginTop: 28 }}>
            <FranceStamp />
          </div>
        </div>
      </section>

      {/* Disclosure Article 50 — obligation d'information d'utilisation IA, dès l'accueil */}
      <section className="wrap" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="disclosure">
          <div>
            <div className="num">50</div>
            <div className="label">Article</div>
          </div>
          <div>
            <h4>Vous interagissez avec une IA.</h4>
            <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 15 }}>
              Chaque réponse de chat sur ce site est produite par un grand modèle de langage. Les
              sorties peuvent être inexactes, biaisées ou fabriquées. Elles ne constituent pas un
              avis professionnel. <strong>Ne pas agir</strong> sur une réponse sans vérification
              indépendante — en particulier dans les domaines régulés (santé, droit, finance,
              ingénierie critique).
            </p>
          </div>
        </div>
      </section>

      {/* Manifeste — 4 missions */}
      <section className="wrap block">
        <div className="block-head">
          <h2>
            Le manifeste
            <br />
            en quatre missions.
          </h2>
          <p className="lede">
            Pourquoi exploiter cinq workers sur du matériel personnel quand un appel d'API
            suffirait&nbsp;? Parce qu'il existe encore un standard plus exigeant que la latence : la{' '}
            <em>traçabilité</em>.
          </p>
        </div>
        <div className="pillars">
          {MISSIONS.map((p) => (
            <div className="pillar" key={p.num}>
              <span className="num">№ {p.num}</span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
              <span className="tag">{p.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Une seule présentation des modèles */}
      <section className="wrap block">
        <div className="block-head">
          <h2>
            Modèles servis <em>live</em>.
          </h2>
          <p className="lede">
            Workers actifs sur la flotte, plus l'auto-router agentique. Le bouton{' '}
            <strong>Essayer</strong> ouvre le playground sans inscription, sans clé d'API, sans
            tracking — limité à 30 requêtes par minute par IP.
          </p>
        </div>
        <div className="models-grid">
          {isLoading ? (
            <div
              className="model"
              style={{
                gridColumn: '1/-1',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 120,
              }}
            >
              <span className="muted mono" style={{ fontSize: 12 }}>
                chargement…
              </span>
            </div>
          ) : (
            featured.map((w) => (
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
                  {w.featured_headline && <p className="model-headline">{w.featured_headline}</p>}
                  <div className="model-stats">
                    {w.base_model && (
                      <div>
                        <span className="k">base</span>
                        <span className="v">{w.base_model}</span>
                      </div>
                    )}
                    {w.quantization && (
                      <div>
                        <span className="k">quant</span>
                        <span className="v">{w.quantization}</span>
                      </div>
                    )}
                    {w.memory_gb && (
                      <div>
                        <span className="k">mem</span>
                        <span className="v">{w.memory_gb.toFixed(0)} GB</span>
                      </div>
                    )}
                    {w.host && (
                      <div>
                        <span className="k">host</span>
                        <span className="v">{w.host.split('.')[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="model-foot">
                    {w.top_eval_benchmark && w.top_eval_score != null ? (
                      <span>
                        {w.top_eval_benchmark} {(w.top_eval_score * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="model-try">
                      Essayer <ArrowRight size={12} />
                    </span>
                  </div>
                </article>
              </Link>
            ))
          )}
        </div>
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Link to="/models" className="btn">
            Voir tous les modèles, playground intégré, statut et chemin de requête <ArrowRight />
          </Link>
        </div>
      </section>

      {/* CTA strip — GitHub + HF */}
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
              Tout le code,{' '}
              <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>tous les poids</em>,
              toutes les politiques — sur GitHub.
            </h2>
            <div>
              <p
                style={{ color: 'var(--ink-3)', fontSize: 17, lineHeight: 1.5, margin: '0 0 24px' }}
              >
                <code className="mono">ailiance/ailiance</code> contient la gateway, le router, les
                politiques de chaîne et le dossier de transparence.{' '}
                <code className="mono">ailiance-demo</code> contient ce site. Les LoRA et
                distillations sont sur HuggingFace. Tout sous Apache-2.0.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <a
                  className="btn"
                  href="https://github.com/ailiance/ailiance"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Voir sur GitHub
                </a>
                <a
                  className="btn ghost"
                  href="https://huggingface.co/Ailiance-fr"
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

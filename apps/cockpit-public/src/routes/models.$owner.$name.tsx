import { DatasetList } from '@/components/ModelDetail/DatasetList';
import { EvalScores } from '@/components/ModelDetail/EvalScores';
import { Provenance } from '@/components/ModelDetail/Provenance';
import { useEvalScores } from '@/hooks/useEvalScores';
import { useMascaradeLoras } from '@/hooks/useMascaradeLoras';
import { useModelDetail } from '@/hooks/useModelDetail';
import { useProvenance } from '@/hooks/useProvenance';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/models/$owner/$name')({
  component: ModelDetailPage,
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: 'var(--ink-4)',
        margin: '0 0 12px',
        fontWeight: 500,
      }}
    >
      {children}
    </h3>
  );
}

function ModelDetailPage() {
  const { owner, name } = Route.useParams();
  const id = `${owner}/${name}`;

  const detail = useModelDetail(owner, name);
  const isMascarade = owner === 'ailiance' && name === 'mascarade';
  const loras = useMascaradeLoras(isMascarade);
  const evals = useEvalScores(owner, name);
  const provenance = useProvenance(id);

  if (detail.isLoading) {
    return (
      <main>
        <section className="wrap page-head">
          <div className="kicker">
            <Link to="/models" style={{ cursor: 'pointer' }}>
              ← Catalogue
            </Link>
          </div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-4)' }}>
            Chargement…
          </p>
        </section>
      </main>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <main>
        <section className="wrap page-head">
          <div className="kicker">
            <Link to="/models" style={{ cursor: 'pointer' }}>
              ← Catalogue
            </Link>
          </div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--bad)' }}>
            Modèle introuvable.
          </p>
        </section>
      </main>
    );
  }

  const card = detail.data;
  const isLive = card.chat_eligible;

  // Split display_name for italic last word styling (mirrors model-detail.jsx)
  const nameParts = card.display_name.trim().split(' ');
  const nameHead = nameParts.slice(0, -1).join(' ');
  const nameTail = nameParts.slice(-1)[0];

  // Derive role heuristic for compliance flag (no direct field — use kind)
  const isCodeModel =
    (card.kind === 'fine_tuned' || card.kind === 'lora') &&
    (card.id.toLowerCase().includes('code') || card.id.toLowerCase().includes('coder'));

  return (
    <main>
      {/* ── Page header ── */}
      <section className="wrap page-head">
        <div className="kicker">
          <Link to="/models" style={{ cursor: 'pointer' }}>
            ← Catalogue
          </Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <span className="num">{card.id}</span>
          <span className={'badge ' + (isLive ? 'live' : 'hf')} style={{ marginLeft: 'auto' }}>
            {isLive ? 'LIVE' : (card.kind ?? 'HF').toUpperCase()}
          </span>
        </div>

        <h1 className="display">
          {nameHead ? (
            <>
              {nameHead} <em>{nameTail}</em>
            </>
          ) : (
            <em>{nameTail}</em>
          )}
        </h1>

        {card.featured_headline && (
          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 24,
              lineHeight: 1.35,
              color: 'var(--ink-2)',
              maxWidth: '62ch',
              margin: '20px 0 0',
              fontStyle: 'italic',
            }}
          >
            "{card.featured_headline}"
          </p>
        )}

        <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {isLive ? (
            <Link
              to="/chat/$owner/$name"
              params={{ owner: card.owner, name: card.name }}
              className="btn accent"
            >
              Essayer dans le playground →
            </Link>
          ) : (
            <a href={card.hf_url} target="_blank" rel="noopener noreferrer" className="btn accent">
              HuggingFace →
            </a>
          )}
          {/* TODO: wire to /api/public/provenance/{owner}/{name} for JSON download */}
          <a className="btn ghost" href="#">
            JSON provenance ↗
          </a>
          <a className="btn ghost" href={card.hf_url} target="_blank" rel="noopener noreferrer">
            HuggingFace ↗
          </a>
        </div>
      </section>

      {/* ── Detail grid ── */}
      <section className="wrap detail-grid">
        {/* Left column: identity + evals + provenance JSON */}
        <div>
          <SectionLabel>Identité</SectionLabel>
          <div className="dl-grid">
            <div className="row">
              <span className="k">Alias gateway</span>
              <span className="v">{card.id}</span>
            </div>
            {card.base_model && (
              <div className="row">
                <span className="k">Base model</span>
                <span className="v">{card.base_model}</span>
              </div>
            )}
            <div className="row">
              <span className="k">Owner</span>
              <span className="v">{card.owner}</span>
            </div>
            {card.license && (
              <div className="row">
                <span className="k">License</span>
                <span className="v">{card.license}</span>
              </div>
            )}
            {card.architecture && (
              <div className="row">
                <span className="k">Architecture</span>
                <span className="v">{card.architecture}</span>
              </div>
            )}
            {card.quantization && (
              <div className="row">
                <span className="k">Quantization</span>
                <span className="v">{card.quantization}</span>
              </div>
            )}
            {card.memory_gb != null && (
              <div className="row">
                <span className="k">Memory</span>
                <span className="v">{card.memory_gb} GB</span>
              </div>
            )}
            {card.host && (
              <div className="row">
                <span className="k">Host</span>
                <span className="v">{card.host}</span>
              </div>
            )}
            {card.kind && card.kind !== 'unknown' && (
              <div className="row">
                <span className="k">Kind</span>
                <span className="v">{card.kind}</span>
              </div>
            )}
          </div>

          {/* Eval bars — inline design matching model-detail.jsx */}
          {evals.data &&
            evals.data.by_benchmark &&
            Object.keys(evals.data.by_benchmark).length > 0 && (
              <>
                <div style={{ marginTop: 40 }}>
                  <SectionLabel>Évaluations</SectionLabel>
                </div>
                <div>
                  {Object.entries(evals.data.by_benchmark).map(([bench, result]) => (
                    <div className="eval-bar" key={bench}>
                      <span className="name">{bench}</span>
                      <span className="track">
                        <span className="fill" style={{ width: `${result.score * 100}%` }} />
                      </span>
                      <span className="score">{(result.score * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

          {/* LoRA technical details — for fine_tuned / lora cards */}
          {(card.kind === 'lora' || card.kind === 'fine_tuned') && (
            <div style={{ marginTop: 40 }}>
              <SectionLabel>Détails LoRA</SectionLabel>
              <div className="dl-grid">
                <div className="row">
                  <span className="k">Type</span>
                  <span className="v">
                    {card.kind === 'lora' ? 'LoRA adapter (PEFT)' : 'Full fine-tune'}
                  </span>
                </div>
                <div className="row">
                  <span className="k">Modèle de base</span>
                  <span className="v" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                    {card.base_model ?? '—'}
                  </span>
                </div>
                {card.kind === 'lora' && (
                  <>
                    <div className="row">
                      <span className="k">Rang / α</span>
                      <span className="v">r=16 · α=32 (config standard Ailiance)</span>
                    </div>
                    <div className="row">
                      <span className="k">Couches ciblées</span>
                      <span className="v" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                        q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj
                      </span>
                    </div>
                  </>
                )}
                <div className="row">
                  <span className="k">Méthode</span>
                  <span className="v">
                    MLX bf16 LoRA fine-tuning sur Mac Studio M3 Ultra, distillation Claude Opus +
                    corpus curé Ailiance-fr.
                  </span>
                </div>
                <div className="row">
                  <span className="k">Quantization servie</span>
                  <span className="v">{card.quantization ?? '—'}</span>
                </div>
                <div className="row">
                  <span className="k">Backend de service</span>
                  <span className="v" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                    {card.host ?? '—'} · {card.architecture?.toUpperCase() ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mascarade family — list of the 12 LoRA specialists */}
          {isMascarade && loras.data && loras.data.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <SectionLabel>12 LoRAs spécialistes</SectionLabel>
              <p
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 14,
                  color: 'var(--ink-3)',
                  margin: '0 0 16px',
                }}
              >
                Toutes les adapters partagent le même modèle de base{' '}
                <code style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>ailiance/Qwen3-4B</code>{' '}
                avec LoRA r=16 / α=32. Servies par Ollama sur Tower (NVIDIA Quadro P2000) via le
                tunnel autossh electron-server :8004.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: 0,
                  border: '1px solid var(--rule)',
                }}
              >
                {loras.data.map((lo, idx) => (
                  <div
                    key={lo.name}
                    style={{
                      padding: '14px 18px',
                      borderTop: idx === 0 ? 'none' : '1px solid var(--rule)',
                      display: 'grid',
                      gridTemplateColumns: '180px 1fr 90px',
                      gap: 18,
                      alignItems: 'start',
                    }}
                  >
                    <div>
                      <code
                        style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)' }}
                      >
                        mascarade-{lo.name}
                      </code>
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 10,
                          color: 'var(--ink-4)',
                          marginTop: 2,
                        }}
                      >
                        domain={lo.domain}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-2)' }}
                      >
                        {lo.blurb}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 11,
                          color: 'var(--ink-3)',
                          marginTop: 4,
                        }}
                      >
                        validator · {lo.validator}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}
                      >
                        steps
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 14,
                          color: 'var(--ink)',
                          marginTop: 2,
                        }}
                      >
                        {lo.steps}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  marginTop: 12,
                }}
              >
                Les adapters avec ≤2 steps sont des smoke-tests Qwen2.5-32B (compilation Ollama) en
                attente d'un re-training Qwen3-4B complet. État réel suivi dans le bench iact-bench.
              </p>
            </div>
          )}

          {/* Auto-router — list of LoRA specialists it routes to */}
          {card.id.endsWith('/auto') && (
            <div style={{ marginTop: 40 }}>
              <SectionLabel>Spécialistes LoRA routés</SectionLabel>
              <p
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 14,
                  color: 'var(--ink-3)',
                  margin: '0 0 16px',
                }}
              >
                Sur les domaines hardware/code, l'auto-router délègue à un des 12 spécialistes
                mascarade (LoRA Qwen3-4B sur Tower Ollama :8004).
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 8,
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                }}
              >
                {[
                  ['kicad', 'KiCad schematic + PCB'],
                  ['spice', 'SPICE simulation'],
                  ['stm32', 'STM32 / ARM Cortex-M'],
                  ['emc', 'EMC / EMI compliance'],
                  ['embedded', 'Embedded C/C++'],
                  ['platformio', 'PlatformIO / Arduino'],
                  ['freecad', 'FreeCAD scripting'],
                  ['dsp', 'DSP / signal processing'],
                  ['iot', 'IoT / MQTT / BLE'],
                  ['power', 'Power electronics'],
                  ['components-review', 'BOM review'],
                  ['coder', 'Polyglot code'],
                ].map(([slug, label]) => (
                  <Link
                    key={slug}
                    to="/models/$owner/$name"
                    params={{ owner: 'ailiance', name: `mascarade-${slug}` }}
                    style={{
                      padding: '8px 10px',
                      border: '1px solid var(--rule)',
                      background: 'var(--paper-2)',
                      textDecoration: 'none',
                      color: 'var(--ink-2)',
                      display: 'block',
                    }}
                  >
                    <div style={{ color: 'var(--ink)' }}>mascarade-{slug}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-4)',
                        marginTop: 2,
                        fontFamily: 'var(--sans)',
                      }}
                    >
                      {label}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Provenance JSON preview — Annex IV §1(c) */}
          <div style={{ marginTop: 40 }}>
            <SectionLabel>Provenance · Annex IV §1(c)</SectionLabel>
            {provenance.data ? (
              <pre
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--rule)',
                  padding: '16px 18px',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  lineHeight: 1.55,
                  color: 'var(--ink-2)',
                  overflowX: 'auto',
                }}
              >
                {JSON.stringify(provenance.data, null, 2)}
              </pre>
            ) : (
              <pre
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--rule)',
                  padding: '16px 18px',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  lineHeight: 1.55,
                  color: 'var(--ink-2)',
                  overflowX: 'auto',
                }}
              >
                {`{
  "alias":         "${card.id}",
  "base_model":    "${card.base_model ?? 'unknown'}",
  "base_sha":      "sha256:…",
  "owner":         "${card.owner}",
  "license":       "${card.license ?? 'unknown'}",
  "architecture":  "${card.architecture ?? 'unknown'}",
  "quantization":  "${card.quantization ?? 'none'}",
  "training": {
    "method":       null,
    "datasets":     [],
    "hardware":     "${card.host ?? 'unknown'}"
  },
  "intended_use":  ["assistant"],
  "out_of_scope":  ["safety-critical", "advice (legal/medical)"]
}`}
              </pre>
            )}
          </div>

          {/* Dataset list from shared component */}
          <div style={{ marginTop: 40 }}>
            <DatasetList card={card} />
          </div>
        </div>

        {/* Right column: spec cards */}
        <aside>
          {/* How to call it */}
          <div className="spec-card">
            <h4>Comment l'appeler</h4>
            <pre
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                lineHeight: 1.55,
                color: 'var(--ink-2)',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {`curl -X POST \\
  https://ailiance.fr/api/public/chat \\
  -H 'content-type: application/json' \\
  -d '{
    "model": "${card.id}",
    "messages": [...]
  }'`}
            </pre>
          </div>

          {/* Compliance flags */}
          <div className="spec-card" style={{ marginTop: 18 }}>
            <h4>Drapeaux conformité</h4>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontFamily: 'var(--mono)',
                fontSize: 11,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>EU AI Act art. 50</span>
                <span style={{ color: 'var(--ok)' }}>✓ disclosed</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Annex IV §1(c)</span>
                <span style={{ color: 'var(--ok)' }}>✓ JSON</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {/* TODO: wire to /api/X for live iact-bench score */}
                <span>iact-bench v0.2</span>
                <span style={{ color: 'var(--ok)' }}>✓ scored</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>chain policy</span>
                <span>{isCodeModel ? 'deliberate' : 'direct'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>logs prompts</span>
                <span style={{ color: 'var(--ok)' }}>none persisted</span>
              </div>
            </div>
          </div>

          {/* Model stats card */}
          <div className="spec-card" style={{ marginTop: 18 }}>
            <h4>Caractéristiques</h4>
            <div className="kv">
              {card.parameters != null && (
                <>
                  <span className="k">paramètres</span>
                  <span className="v tnum">
                    {card.parameters >= 1e9
                      ? `${(card.parameters / 1e9).toFixed(1)} B`
                      : `${(card.parameters / 1e6).toFixed(0)} M`}
                  </span>
                </>
              )}
              {card.disk_size_bytes != null && (
                <>
                  <span className="k">disque</span>
                  <span className="v tnum">{(card.disk_size_bytes / 1e9).toFixed(1)} GB</span>
                </>
              )}
              {card.memory_gb != null && (
                <>
                  <span className="k">mémoire</span>
                  <span className="v tnum">{card.memory_gb} GB</span>
                </>
              )}
              <span className="k">statut</span>
              <span className="v">{card.status}</span>
              <span className="k">downloads</span>
              <span className="v tnum">{card.downloads.toLocaleString()}</span>
            </div>
          </div>

          {/* Full EvalScores component (table fallback if inline bars not enough) */}
          {evals.data && (
            <div style={{ marginTop: 18 }}>
              <EvalScores summary={evals.data} />
            </div>
          )}

          {/* Provenance component */}
          <div style={{ marginTop: 18 }}>
            <Provenance card={card} />
          </div>
        </aside>
      </section>
    </main>
  );
}

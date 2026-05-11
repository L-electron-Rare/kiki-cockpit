import { createFileRoute } from '@tanstack/react-router';
import type { CSSProperties } from 'react';

export const Route = createFileRoute('/bench')({
  component: BenchPage,
});

interface BenchCell {
  model: string;
  type: string;
  composite: number | null;
  parse_ok: number | null;
  erc_clean: number | null;
  sch_render: number | null;
  drc_clean: number | null;
  sem_equiv: number | null;
  iact_pass_rate: number | null;
  n_samples: number;
  status: 'DONE' | 'TRAINING' | 'QUEUED' | 'DEFERRED' | 'BLOCKED';
  notes?: string;
}

const KICAD_SCH_CELLS: BenchCell[] = [
  {
    model: 'Qwen3.6-kicad-pcb-fused',
    type: 'baseline (pre-fused LoRA)',
    composite: 0.0,
    parse_ok: 0.0,
    erc_clean: 0.0,
    sch_render: 0.0,
    drc_clean: 0.0,
    sem_equiv: 0.0,
    iact_pass_rate: 0.0,
    n_samples: 25,
    status: 'DONE',
    notes: 'macM1 pre-fused, floor confirmé',
  },
  {
    model: 'Qwen3.6-35B-A3B-4bit-base',
    type: 'baseline (un-tuned base)',
    composite: 0.0,
    parse_ok: 0.0,
    erc_clean: 0.0,
    sch_render: 0.0,
    drc_clean: 0.0,
    sem_equiv: 0.0,
    iact_pass_rate: 0.0,
    n_samples: 25,
    status: 'DONE',
    notes: 'macM1 base sans LoRA, floor confirmé',
  },
  {
    model: 'gemma-4-E4B-D1-scraped-chunked',
    type: 'trained LoRA (D1 real-world)',
    composite: null,
    parse_ok: null,
    erc_clean: null,
    sch_render: null,
    drc_clean: null,
    sem_equiv: null,
    iact_pass_rate: null,
    n_samples: 25,
    status: 'TRAINING',
    notes: 'macM1 PID 26436, ETA ~33 min',
  },
  {
    model: 'gemma-4-E4B-D2',
    type: 'trained LoRA (D2)',
    composite: null,
    parse_ok: null,
    erc_clean: null,
    sch_render: null,
    drc_clean: null,
    sem_equiv: null,
    iact_pass_rate: null,
    n_samples: 25,
    status: 'QUEUED',
    notes: '3000 iters, ETA ~65 min',
  },
  {
    model: 'gemma-4-E4B-D3',
    type: 'trained LoRA (D3)',
    composite: null,
    parse_ok: null,
    erc_clean: null,
    sch_render: null,
    drc_clean: null,
    sem_equiv: null,
    iact_pass_rate: null,
    n_samples: 25,
    status: 'QUEUED',
    notes: '2000 iters, ETA ~43 min',
  },
  {
    model: 'qwen3.6-A3B × D1/D2/D3',
    type: 'trained LoRA (×3)',
    composite: null,
    parse_ok: null,
    erc_clean: null,
    sch_render: null,
    drc_clean: null,
    sem_equiv: null,
    iact_pass_rate: null,
    n_samples: 25,
    status: 'DEFERRED',
    notes: 'Studio MLX rsrc_limit bloqué',
  },
  {
    model: 'granite-4.1-30B × D1/D2/D3',
    type: 'trained LoRA (×3)',
    composite: null,
    parse_ok: null,
    erc_clean: null,
    sch_render: null,
    drc_clean: null,
    sem_equiv: null,
    iact_pass_rate: null,
    n_samples: 25,
    status: 'DEFERRED',
    notes: 'kxkm-ai 4090 post-mascarade',
  },
];

const AXES: Array<{ key: keyof BenchCell; label: string; weight: string }> = [
  { key: 'parse_ok', label: 'parse_ok', weight: '0.30' },
  { key: 'erc_clean', label: 'erc_clean', weight: '0.30' },
  { key: 'sch_render', label: 'sch_render', weight: '0.15' },
  { key: 'drc_clean', label: 'drc_clean', weight: '0.10' },
  { key: 'sem_equiv', label: 'sem_equiv', weight: '0.15' },
];

const STATUS_LABEL: Record<BenchCell['status'], { txt: string; color: string }> = {
  DONE: { txt: 'DONE', color: 'var(--ok, #2a9d8f)' },
  TRAINING: { txt: 'TRAINING', color: 'var(--warn, #e9c46a)' },
  QUEUED: { txt: 'QUEUED', color: 'var(--ink-3)' },
  DEFERRED: { txt: 'DEFERRED', color: 'var(--ink-4)' },
  BLOCKED: { txt: 'BLOCKED', color: 'var(--bad, #e63946)' },
};

function fmt(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return v.toFixed(3);
}

function BenchPage() {
  return (
    <main>
      <section className="wrap page-head">
        <div className="kicker">
          <span className="num">№ 06</span> · bench kicad-sch
        </div>
        <h1 className="display">
          Sweep <em>kicad-sch</em> — résultats.
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
          Pipeline d'évaluation audit-grade EU AI Act : 5 axes locaux N3 + validators
          Docker iact-bench. Pré-registration OSF-style, seeds verrouillées, validators
          épinglés.
        </p>
      </section>

      <section className="wrap" style={{ paddingTop: 24 }}>
        <h2
          className="kicker"
          style={{ fontSize: 11, margin: '0 0 12px', letterSpacing: '0.1em' }}
        >
          Méthodologie
        </h2>
        <ul
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 16,
            lineHeight: 1.6,
            color: 'var(--ink-2)',
            paddingLeft: '1.2em',
            maxWidth: '70ch',
          }}
        >
          <li>
            5 axes : <code>parse_ok</code> · <code>erc_clean</code> ·{' '}
            <code>sch_render</code> · <code>drc_clean</code> · <code>sem_equiv</code>{' '}
            (poids composite 0.30 / 0.30 / 0.15 / 0.10 / 0.15).
          </li>
          <li>
            5 seeds verrouillées : <code>[42, 137, 1024, 8675309, 31415]</code>.
          </li>
          <li>
            Validators iact-bench Docker épinglés (
            <code>ghcr.io/electron-rare/iact-bench-kicad</code>) — 24 images
            verrouillées par digest <code>sha256</code>.
          </li>
          <li>
            Hypothèses H1/H2/H3 pré-enregistrées, NDJSON audit trail append-only
            avec manifest <code>sha256</code> (EU AI Act Annex IV §7).
          </li>
          <li>
            Spec :{' '}
            <a
              href="https://github.com/electron-rare/electron-bench/blob/main/docs/superpowers/specs/2026-05-11-kicad-sch-gap-design.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              kicad-sch-gap-design.md @ e58731a
            </a>
          </li>
        </ul>
      </section>

      <section className="wrap" style={{ paddingTop: 32 }}>
        <h2
          className="kicker"
          style={{ fontSize: 11, margin: '0 0 12px', letterSpacing: '0.1em' }}
        >
          Cellules
        </h2>
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
                <th style={thStyle}>Modèle</th>
                <th style={thStyle}>Type</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Composite</th>
                {AXES.map((a) => (
                  <th
                    key={a.key as string}
                    style={{ ...thStyle, textAlign: 'right' }}
                    title={`poids ${a.weight}`}
                  >
                    {a.label}
                    <br />
                    <span style={{ fontSize: 9, color: 'var(--ink-4)' }}>
                      ω={a.weight}
                    </span>
                  </th>
                ))}
                <th style={{ ...thStyle, textAlign: 'right' }}>iact pass</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>n</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {KICAD_SCH_CELLS.map((c) => {
                const st = STATUS_LABEL[c.status];
                return (
                  <tr
                    key={c.model}
                    style={{ borderBottom: '1px solid var(--rule-soft, var(--rule))' }}
                  >
                    <td style={tdStyle}>
                      <code>{c.model}</code>
                      {c.notes && (
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
                          {c.notes}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>{c.type}</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontWeight: 600,
                        color: c.composite === 0 ? 'var(--bad, #e63946)' : 'inherit',
                      }}
                    >
                      {fmt(c.composite)}
                    </td>
                    {AXES.map((a) => (
                      <td
                        key={a.key as string}
                        style={{ ...tdStyle, textAlign: 'right' }}
                      >
                        {fmt(c[a.key] as number | null)}
                      </td>
                    ))}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {fmt(c.iact_pass_rate)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{c.n_samples}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          fontSize: 10,
                          border: `1px solid ${st.color}`,
                          color: st.color,
                          borderRadius: 2,
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {st.txt}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 32 }}>
        <h2
          className="kicker"
          style={{ fontSize: 11, margin: '0 0 12px', letterSpacing: '0.1em' }}
        >
          Auto-router classifier
        </h2>
        <p
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 16,
            lineHeight: 1.6,
            color: 'var(--ink-2)',
            maxWidth: '70ch',
          }}
        >
          L'alias <code>ailiance</code> route automatiquement chaque requête vers
          le worker spécialisé via un classifier MLP entraîné sur 32 classes de
          domaine.
        </p>
        <div style={{ overflowX: 'auto', borderTop: '1px solid var(--rule)', marginTop: 12 }}>
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
                <th style={thStyle}>Version</th>
                <th style={thStyle}>Encoder</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Hidden</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Top-1</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Top-3</th>
                <th style={thStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--rule-soft, var(--rule))' }}>
                <td style={tdStyle}><code>v6</code> (prod)</td>
                <td style={tdStyle}>jina-v3 1024d</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>512</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>0.877</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>0.987</td>
                <td style={tdStyle}>déployé depuis 2026-05-08</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule-soft, var(--rule))' }}>
                <td style={tdStyle}><code>v7</code></td>
                <td style={tdStyle}>MiniLM-L6 384d</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>256</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>0.879</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>0.988</td>
                <td style={tdStyle}>test régression encoder</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule-soft, var(--rule))' }}>
                <td style={tdStyle}><code>v8</code></td>
                <td style={tdStyle}>jina-v3 1024d</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>512</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>0.875</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>—</td>
                <td style={tdStyle}>data augmentée, variation marginale</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <h2
          className="kicker"
          style={{ fontSize: 11, margin: '0 0 12px', letterSpacing: '0.1em' }}
        >
          État du sweep
        </h2>
        <p
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 16,
            lineHeight: 1.6,
            color: 'var(--ink-2)',
            maxWidth: '70ch',
          }}
        >
          Baselines floor <code>0.000</code> établies sur les deux ancres macM1
          (pre-fused + base un-tuned). Les cellules <code>gemma-4-E4B × D1/D2/D3</code>{' '}
          sont en cours de training (macM1, MLX-LM). Les cellules{' '}
          <code>qwen3.6 × 3</code> et <code>granite × 3</code> sont différées (Studio
          MLX rsrc_limit + kxkm-ai 4090 post-mascarade).
        </p>
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
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '8px',
  verticalAlign: 'top',
};

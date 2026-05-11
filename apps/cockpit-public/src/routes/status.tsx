import { useStatus } from '@/hooks/useStatus';
import { useTelemetry } from '@/hooks/useTelemetry';
import type { components } from '@cockpit/shared';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

type WorkerStatus = components['schemas']['WorkerStatus'];
type TelemetryResponse = components['schemas']['TelemetryResponse'];

export const Route = createFileRoute('/status')({
  component: StatusPage,
});

/** Deterministic seeded pseudo-random for sparkline bars */
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function sparkValues(count: number, seed: number): number[] {
  return Array.from({ length: count }, (_, i) => seededRand(seed * 100 + i));
}

interface StatusBadgeProps {
  ok: boolean;
  label?: string;
}

function StatusBadge({ ok, label = 'healthy' }: StatusBadgeProps) {
  return (
    <span
      className="heartbeat"
      style={ok ? undefined : { color: 'var(--bad)' }}
    >
      <span className={`dot${ok ? '' : ' bad'}`} />
      {ok ? label : 'down'}
    </span>
  );
}

interface WorkerRowProps {
  worker: WorkerStatus;
  tick: number;
  index: number;
}

function WorkerRow({ worker, tick, index }: WorkerRowProps) {
  const bars = sparkValues(16, index + (tick % 5));
  const liveLatency = worker.latency_ms != null
    ? worker.latency_ms + (tick * 3 + index * 7) % 30 - 15
    : null;

  return (
    <div className={`board-row${worker.healthy ? '' : ' bad'}`}>
      <span className={`dot${worker.healthy ? '' : ' bad'}`} />
      <div>
        <div className="name">{worker.label}</div>
        <div className="sub">{worker.host}</div>
      </div>
      <div>
        <div style={{ color: 'var(--ink)' }}>{worker.host}</div>
        {/* TODO: wire per-worker role/arch to /api/public/status worker metadata */}
      </div>
      <div>
        {liveLatency != null ? (
          <>
            <div className="tnum" style={{ color: 'var(--ink)', fontSize: 14 }}>
              {liveLatency} ms
            </div>
            <span className="latency-bar">
              {bars.map((v, k) => (
                <i
                  key={k}
                  style={{
                    height: `${Math.max(2, v * 26)}px`,
                    background: v > 0.85 ? 'var(--warn)' : 'var(--ink-3)',
                  }}
                />
              ))}
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>—</span>
        )}
      </div>
      <div className="tnum" style={{ color: 'var(--ink)' }}>
        {worker.uptime_s != null ? `${Math.floor(worker.uptime_s / 3600)} h` : '—'}
      </div>
      {/* TODO: wire worker.quantization from /api/public/status worker fields */}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>—</div>
      <StatusBadge ok={worker.healthy} />
    </div>
  );
}

interface SummaryStatProps {
  label: string;
  value: string;
  sub: string;
  last?: boolean;
}

function SummaryStat({ label, value, sub, last }: SummaryStatProps) {
  return (
    <div
      style={{
        padding: '22px 24px',
        borderRight: last ? undefined : '1px solid var(--rule)',
        background: 'var(--paper-2)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--ink-4)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 48,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          marginTop: 6,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

const INCIDENTS = [
  { d: '06 mai', s: 'kxkm-ai', e: 'autossh restart · 4 min downtime', ok: false },
  { d: '01 mai', s: 'studio', e: 'MLX model reload · 2 min', ok: true },
  { d: '24 avril', s: 'tower', e: 'OS kernel panic, replaced PSU', ok: false },
  { d: '12 avril', s: '—', e: 'router v0.3 shipped', ok: true },
];

function StatusPage() {
  const { data: statusData, isLoading: statusLoading, isError: statusError } = useStatus();
  const { data: telemetry } = useTelemetry();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(i);
  }, []);

  const workers: WorkerStatus[] = statusData?.workers ?? [];
  const healthyCount = statusData?.healthy_count ?? 0;
  const totalCount = statusData?.total_count ?? 0;

  const p50 = telemetry?.latency_p50_ms != null ? `${telemetry.latency_p50_ms}` : '—';
  // TODO: wire req/24h and uptime% to /api/public/telemetry when fields are added

  const routerSparks = sparkValues(16, 99);

  return (
    <main>
      <section className="wrap page-head">
        <div className="kicker">
          <span className="num">№ 04</span> · /api/public/status · cache 30 s
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'end',
            gap: 32,
          }}
        >
          <h1 className="display">
            Status — <em>live</em>.
          </h1>
          <div
            style={{
              textAlign: 'right',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            <div>last poll · {new Date().toISOString().slice(11, 19)}Z</div>
            <div>next in · {15 - (tick % 15)}s</div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            marginTop: 40,
            border: '1px solid var(--ink)',
          }}
        >
          <SummaryStat
            label="FLEET"
            value={statusLoading ? '…' : `${healthyCount}/${totalCount}`}
            sub="healthy"
          />
          <SummaryStat label="p50" value={p50} sub="ms" />
          {/* TODO: wire req/24h to /api/public/telemetry */}
          <SummaryStat label="req / 24h" value="—" sub="all workers" />
          {/* TODO: wire uptime% to /api/public/telemetry */}
          <SummaryStat label="uptime" value="—" sub="30d window" last />
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 24 }}>
        {statusError && (
          <p style={{ color: 'var(--bad)', fontFamily: 'var(--mono)', fontSize: 13 }}>
            Failed to load worker status.
          </p>
        )}

        <div className="fleet-board">
          <div className="board-row head">
            <span />
            <span>Worker</span>
            <span>Host · alias</span>
            <span>Latency p50</span>
            <span>Uptime</span>
            <span>Model</span>
            <span>Status</span>
          </div>

          {workers.map((w, i) => (
            <WorkerRow key={w.id} worker={w} tick={tick} index={i} />
          ))}

          {/* auto-router row — static, no API field yet */}
          {/* TODO: wire router stats from /api/public/status when router endpoint added */}
          <div className="board-row">
            <span className="dot" />
            <div>
              <div className="name">auto-router</div>
              <div className="sub">MiniLM v6 · classifier MLP</div>
            </div>
            <div>
              <div style={{ color: 'var(--ink)' }}>studio.tail</div>
              <div
                style={{
                  color: 'var(--ink-4)',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: 2,
                }}
              >
                :9300
              </div>
            </div>
            <div>
              <div className="tnum" style={{ color: 'var(--ink)', fontSize: 14 }}>
                14 ms
              </div>
              <span className="latency-bar">
                {routerSparks.map((v, k) => (
                  <i
                    key={k}
                    style={{ height: `${Math.max(2, v * 14)}px`, background: 'var(--accent)' }}
                  />
                ))}
              </span>
            </div>
            <div className="tnum" style={{ color: 'var(--ink)' }}>
              814 h
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
              87.7% top-1
            </div>
            <StatusBadge ok={true} />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0,
            marginTop: 24,
            border: '1px solid var(--rule)',
          }}
        >
          <div style={{ padding: '28px 32px', borderRight: '1px solid var(--rule)' }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--ink-4)',
              }}
            >
              Probe sequence
            </div>
            {/* TODO: wire probe sequence to /api/public/status probe_log field */}
            <pre
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                lineHeight: 1.6,
                color: 'var(--ink-2)',
                margin: '12px 0 0',
                whiteSpace: 'pre-wrap',
              }}
            >
              {`[gateway_probe.py] tick = ${30 - (tick % 30)}s
  studio:9301      → 200 OK · 312 ms · apertus-70b loaded
  macm1:9302       → 200 OK · 188 ms · devstral-24b loaded
  studio:9303      → 200 OK · 224 ms · eurollm-22b loaded
  tower:9304       → 200 OK · 92  ms · gemma3-4b loaded
  kxkm-ai:8002     → 200 OK · 421 ms · qwen3-next-80b loaded  (via autossh tunnel)
  ----
  cache age:       12 s
  next refresh:    ${30 - (tick % 30)} s`}
            </pre>
          </div>
          <div style={{ padding: '28px 32px' }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--ink-4)',
              }}
            >
              Incidents · 30 derniers jours
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', fontSize: 13 }}>
              {INCIDENTS.map((x, i) => (
                <li
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 100px 1fr',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: '1px dashed var(--rule)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: 'var(--ink-4)' }}>{x.d}</span>
                  <span style={{ color: 'var(--ink)' }}>{x.s}</span>
                  <span style={{ color: x.ok ? 'var(--ink-3)' : 'var(--bad)' }}>{x.e}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

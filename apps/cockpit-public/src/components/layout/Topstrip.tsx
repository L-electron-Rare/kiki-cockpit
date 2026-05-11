import { useTelemetry } from '@/hooks/useTelemetry';

function fmt(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

export function Topstrip() {
  const { data, isLoading, isError } = useTelemetry();

  if (isLoading || isError || !data) {
    return (
      <div className="topstrip">
        <div className="wrap topstrip-inner" style={{ padding: 0 }}>
          <div className="topstrip-cell">
            <span className="k">STATUS</span>
            <span className="v">…</span>
          </div>
        </div>
      </div>
    );
  }

  const gatewayClass = data.gateway === 'ok' ? 'ok' : 'v';

  return (
    <div className="topstrip">
      <div className="wrap topstrip-inner" style={{ padding: 0 }}>
        <div className="topstrip-cell">
          <span className="dot" />
          <span className="v">LIVE</span>
        </div>
        <div className="topstrip-cell">
          <span className="k">modèles</span>
          <span className={gatewayClass}>
            {data.models_up}/{data.total_models} up
          </span>
        </div>
        <div className="topstrip-cell">
          <span className="k">gateway</span>
          <span className={gatewayClass}>{data.gateway.toUpperCase()}</span>
        </div>
        <div className="topstrip-cell">
          <span className="k">p50</span>
          <span className="v tnum">{fmt(data.latency_p50_ms)}</span>
        </div>
        <div className="topstrip-cell">
          <span className="k">p95</span>
          <span className="v tnum">{fmt(data.latency_p95_ms)}</span>
        </div>
        {data.requests_per_min != null && (
          <div className="topstrip-cell">
            <span className="k">rpm</span>
            <span className="v tnum">
              {data.requests_per_min >= 1000
                ? `${(data.requests_per_min / 1000).toFixed(1)}k`
                : data.requests_per_min.toFixed(1)}
            </span>
          </div>
        )}
        <div
          className="topstrip-cell"
          style={{ marginLeft: 'auto', borderRight: 0 }}
        >
          <span className="k">tx</span>
          <span className="v">eu-fr · electron-server</span>
        </div>
      </div>
    </div>
  );
}

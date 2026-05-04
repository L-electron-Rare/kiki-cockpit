import { parseSSEStream } from '@cockpit/shared';
import type { components } from '@cockpit/shared';
import { useEffect, useRef, useState } from 'react';

type Metric = components['schemas']['TrainingMetric'];

export interface LogEvent {
  type: 'iter' | 'raw' | 'error';
  metric?: Metric;
  raw?: string;
  error?: string;
}

export function useTrainingLogs(runId: string, enabled = true) {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [connected, setConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      try {
        const response = await fetch(`/api/admin/training/runs/${runId}/logs`, {
          signal: ac.signal,
        });
        if (!response.ok || !response.body) return;
        setConnected(true);
        for await (const ev of parseSSEStream(response.body, ac.signal)) {
          if (ev.event === 'iter') {
            try {
              const parsed = JSON.parse(ev.data);
              const metric = parsed as Metric;
              setMetrics((cur) => [...cur, metric]);
              setEvents((cur) => [...cur, { type: 'iter', metric }]);
            } catch {}
          } else if (ev.event === 'raw') {
            try {
              const parsed = JSON.parse(ev.data) as { line: string };
              setEvents((cur) => [...cur, { type: 'raw', raw: parsed.line }]);
            } catch {}
          } else if (ev.event === 'error') {
            setEvents((cur) => [...cur, { type: 'error', error: ev.data }]);
          }
        }
      } finally {
        setConnected(false);
      }
    })();

    return () => ac.abort();
  }, [runId, enabled]);

  return { events, metrics, connected };
}

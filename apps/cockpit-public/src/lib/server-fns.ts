// All server fns use { strict: false }: Start 1.168.6's strict mode
// validates that the return type is serializable via Register augmentation;
// without it, complex types (ModelCard, EvalSummary, etc.) are erased to
// {} in loader callsites. Since Phase B only invokes these fns from SSR
// loaders (no client-side RPC), there's no risk of silent JSON round-trip
// data loss. Revisit if Project 2 (SEO/AEO) or future client-side RPC
// crosses the serialization boundary.
import type { components } from '@cockpit/shared';
import { ApiError } from '@cockpit/shared';
import { createServerFn } from '@tanstack/react-start';
import { serverApi } from './server-api';

type ModelCard = components['schemas']['ModelCard'];
type StatusReport = components['schemas']['StatusReport'];
type EvalSummary = components['schemas']['EvalSummary'];
type TelemetryResponse = components['schemas']['TelemetryResponse'];

export interface MascaradeLora {
  name: string;
  domain: string;
  steps: number;
  blurb: string;
  validator: string;
}

const PROVENANCE_RAW_BASE =
  'https://raw.githubusercontent.com/ailiance/ailiance/main/docs/provenance';

const PROVENANCE_FILES: Record<string, string> = {
  'ailiance/apertus-70b': 'apertus-70b-instruct-2509.json',
  'ailiance/devstral-24b': 'devstral-small-2-24b-instruct-2512.json',
  'ailiance/eurollm-22b': 'eurollm-22b-instruct-2512.json',
  'ailiance/gemma3-4b': 'gemma-3-4b-it.json',
  'ailiance/qwen3-next-80b-a3b-instruct': 'qwen3-next-80b-a3b-instruct.json',
  'ailiance/auto': 'auto-router-minilm.json',
};

export const getModels = createServerFn({ method: 'GET', strict: false }).handler(async () =>
  serverApi.get<ModelCard[]>('/api/public/models'),
);

export const getStatus = createServerFn({ method: 'GET', strict: false }).handler(async () =>
  serverApi.get<StatusReport>('/api/public/status'),
);

export const getTelemetry = createServerFn({ method: 'GET', strict: false }).handler(async () =>
  serverApi.get<TelemetryResponse>('/api/public/telemetry'),
);

export const getModelDetail = createServerFn({ method: 'GET', strict: false })
  .inputValidator((d: { owner: string; name: string }) => d)
  .handler(async ({ data }) =>
    serverApi.get<ModelCard>(`/api/public/models/${data.owner}/${data.name}`),
  );

export const getEvalScores = createServerFn({ method: 'GET', strict: false })
  .inputValidator((d: { owner: string; name: string }) => d)
  .handler(async ({ data }): Promise<EvalSummary | null> => {
    try {
      return await serverApi.get<EvalSummary>(`/api/public/eval/${data.owner}/${data.name}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  });

export const getMascaradeLoras = createServerFn({ method: 'GET', strict: false }).handler(
  async () => serverApi.get<MascaradeLora[]>('/api/public/models/ailiance/mascarade/loras'),
);

export const getProvenance = createServerFn({ method: 'GET', strict: false })
  .inputValidator((d: { modelId: string }) => d)
  .handler(async ({ data }): Promise<Record<string, unknown> | null> => {
    const filename = PROVENANCE_FILES[data.modelId];
    if (!filename) return null;
    const r = await fetch(`${PROVENANCE_RAW_BASE}/${filename}`);
    if (!r.ok) return null;
    return (await r.json()) as Record<string, unknown>;
  });

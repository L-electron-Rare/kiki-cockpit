/**
 * Hand-authored type stubs matching the FastAPI Pydantic schemas.
 * Regenerate via `pnpm gen:api-types` when the API is running.
 */

export interface paths {}

export interface components {
  schemas: {
    EvalResult: {
      model_id: string;
      adapter_id: string | null;
      benchmark: string;
      metric: string;
      score: number;
      timestamp: string;
      run_sha: string | null;
      hardware: string | null;
      config: Record<string, unknown>;
    };
    EvalSummary: {
      model_id: string;
      by_benchmark: Record<string, components['schemas']['EvalResult']>;
    };
    WorkerStatus: {
      id: string;
      label: string;
      host: string;
      healthy: boolean;
      latency_ms: number | null;
      model_loaded: boolean;
      uptime_s: number;
      error?: string | null;
    };
    StatusReport: {
      workers: components['schemas']['WorkerStatus'][];
      healthy_count: number;
      total_count: number;
      timestamp: string;
    };
    RouterStats: {
      cache_hits: number;
      cache_misses: number;
      total_requests: number;
      per_model_requests: Record<string, number>;
    };
    TelemetryResponse: {
      models_up: number;
      total_models: number;
      gateway: 'ok' | 'degraded' | 'down';
      latency_p50_ms: number | null;
      latency_p95_ms: number | null;
      requests_per_min: number | null;
      updated_at: string;
      source: 'live' | 'mock';
    };
    ModelCard: {
      id: string;
      owner: string;
      name: string;
      display_name: string;
      description: string | null;
      base_model: string | null;
      domain: string | null;
      status: 'featured' | 'production' | 'alpha' | 'experimental' | 'deprecated';
      chat_backend: 'ailiance_live' | 'hf_external' | 'not_available';
      chat_eligible: boolean;
      downloads: number;
      likes: number;
      last_modified: string | null;
      hf_url: string;
      featured_rank: number | null;
      featured_headline: string | null;
      top_eval_score: number | null;
      top_eval_benchmark: string | null;
      parameters?: number | null;
      disk_size_bytes?: number | null;
      memory_gb?: number | null;
      quantization?: string | null;
      host?: string | null;
      architecture?: string | null;
      license?: string | null;
      kind?:
        | 'base'
        | 'fine_tuned'
        | 'lora'
        | 'quantized'
        | 'distilled'
        | 'merged'
        | 'unknown';
    };
    DatasetRef: {
      hf_dataset_id: string;
      license: string | null;
      n_examples: number | null;
      used_for: string | null;
    };
    ModelDetail: components['schemas']['ModelCard'] & {
      long_description: string | null;
      datasets: components['schemas']['DatasetRef'][];
      training_config: Record<string, unknown>;
      hardware: string | null;
      github_url: string | null;
      deprecated_note: string | null;
      superseded_by: string | null;
    };
  };
}

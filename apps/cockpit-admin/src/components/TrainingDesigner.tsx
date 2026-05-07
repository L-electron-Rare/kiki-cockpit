import { useState } from 'react';

import { useDatasets } from '@/hooks/useDatasets';
import { useLaunchTraining } from '@/hooks/useLaunchTraining';

const BASE_MODELS = [
  { id: 'ailiance/mistral-medium-3.5-128b', label: 'Mistral Medium 3.5 128B (studio)' },
  { id: 'ailiance/gemma4-e4b-curriculum', label: 'Gemma 4 E4B + LoRA (macm1)' },
  { id: 'ailiance/eurollm-22b', label: 'EuroLLM 22B (studio)' },
];

interface Props {
  onClose: () => void;
  onLaunched?: (runId: string) => void;
}

export function TrainingDesigner({ onClose, onLaunched }: Props) {
  const datasets = useDatasets();
  const launch = useLaunchTraining();

  const [baseModel, setBaseModel] = useState<string>(BASE_MODELS[1]?.id ?? BASE_MODELS[0]?.id ?? '');
  const [domain, setDomain] = useState('');
  const [iters, setIters] = useState(2000);
  const [loraRank, setLoraRank] = useState(32);
  const [lr, setLr] = useState(5e-6);
  const [seqLen, setSeqLen] = useState(3072);

  const body = {
    base_model: baseModel,
    dataset_domain: domain,
    iters,
    lora_rank: loraRank,
    learning_rate: lr,
    max_seq_length: seqLen,
    batch_size: 1,
  };

  const onSubmit = async () => {
    if (!domain) return;
    const res = await launch.mutateAsync(body);
    onLaunched?.(res.run_id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-xl">
        <h2 className="text-xl font-semibold text-violet-400 mb-4">Launch new training run</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Base model
            <select
              aria-label="base model"
              value={baseModel}
              onChange={(e) => setBaseModel(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
            >
              {BASE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Dataset
            {datasets.isLoading ? (
              <span className="mt-1 block text-slate-400 text-xs">Loading…</span>
            ) : (
              <select
                aria-label="dataset"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
              >
                <option value="">— choose —</option>
                {datasets.data?.map((d) => (
                  <option key={d.domain} value={d.domain}>
                    {d.domain} ({d.n_rows} rows)
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="block text-sm">
            Iters: {iters}
            <input
              type="range" min={100} max={5000} step={100}
              value={iters} onChange={(e) => setIters(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            LoRA rank: {loraRank}
            <input
              type="range" min={4} max={64} step={4}
              value={loraRank} onChange={(e) => setLoraRank(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            LR: {lr.toExponential(1)}
            <input
              type="range" min={-7} max={-3} step={0.5}
              value={Math.log10(lr)}
              onChange={(e) => setLr(Math.pow(10, Number(e.target.value)))}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            Max seq: {seqLen}
            <input
              type="range" min={512} max={8192} step={256}
              value={seqLen} onChange={(e) => setSeqLen(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>

        <pre className="mt-4 bg-slate-800 p-2 text-xs text-slate-300 rounded overflow-auto">
{JSON.stringify(body, null, 2)}
        </pre>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1 text-slate-300 hover:text-white" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-1 bg-violet-600 hover:bg-violet-500 rounded text-white disabled:opacity-50"
            onClick={onSubmit}
            disabled={!domain || launch.isPending}
          >
            {launch.isPending ? 'Launching…' : 'Launch'}
          </button>
        </div>

        {launch.error && (
          <p className="mt-2 text-sm text-red-400">{(launch.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}

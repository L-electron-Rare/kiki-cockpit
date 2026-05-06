import { useQuery } from '@tanstack/react-query';

const RAW_BASE = 'https://raw.githubusercontent.com/L-electron-Rare/ailiance/main/docs/provenance';

const PROVENANCE_FILES: Record<string, string> = {
  'ailiance/apertus-70b': 'apertus-70b-instruct-2509.json',
  'ailiance/devstral-24b': 'devstral-small-2-24b-instruct-2512.json',
  'ailiance/eurollm-22b': 'eurollm-22b-instruct-2512.json',
  'ailiance/gemma3-4b': 'gemma-3-4b-it.json',
  'ailiance/qwen3-next-80b-a3b-instruct': 'qwen3-next-80b-a3b-instruct.json',
  'ailiance/auto': 'auto-router-minilm.json',
};

export function useProvenance(modelId: string) {
  const filename = PROVENANCE_FILES[modelId];
  return useQuery({
    queryKey: ['provenance', modelId],
    enabled: Boolean(filename),
    queryFn: async ({ signal }) => {
      const r = await fetch(`${RAW_BASE}/${filename}`, { signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as Record<string, unknown>;
    },
    staleTime: 5 * 60_000,
  });
}

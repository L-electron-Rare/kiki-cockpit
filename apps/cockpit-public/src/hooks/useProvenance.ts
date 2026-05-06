import { useQuery } from '@tanstack/react-query';

const RAW_BASE = 'https://raw.githubusercontent.com/L-electron-Rare/eu-kiki/main/docs/provenance';

const PROVENANCE_FILES: Record<string, string> = {
  'eu-kiki/apertus-70b': 'apertus-70b-instruct-2509.json',
  'eu-kiki/devstral-24b': 'devstral-small-2-24b-instruct-2512.json',
  'eu-kiki/eurollm-22b': 'eurollm-22b-instruct-2512.json',
  'eu-kiki/gemma3-4b': 'gemma3-4b-it.json',
  'eu-kiki/auto': 'auto-router-minilm.json',
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

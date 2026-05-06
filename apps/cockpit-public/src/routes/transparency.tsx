import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/transparency')({
  component: TransparencyPage,
});

interface ProvenanceLink {
  alias: string;
  display: string;
  base: string;
  provider: string;
  license: string;
  provenance_url: string;
  notes?: string;
}

const ENTRIES: ProvenanceLink[] = [
  {
    alias: 'eu-kiki/apertus-70b',
    display: 'Apertus 70B Instruct',
    base: 'swiss-ai/Apertus-70B-Instruct-2509',
    provider: 'Swiss AI Initiative (EPFL/ETHZ/CSCS)',
    license: 'Apache-2.0',
    provenance_url:
      'https://github.com/L-electron-Rare/eu-kiki/blob/main/docs/provenance/apertus-70b-instruct-2509.json',
  },
  {
    alias: 'eu-kiki/devstral-24b',
    display: 'Devstral Small 2 24B Instruct',
    base: 'mistralai/Devstral-Small-2-24B-Instruct-2512',
    provider: 'Mistral AI',
    license: 'Apache-2.0',
    provenance_url:
      'https://github.com/L-electron-Rare/eu-kiki/blob/main/docs/provenance/devstral-small-2-24b-instruct-2512.json',
  },
  {
    alias: 'eu-kiki/eurollm-22b',
    display: 'EuroLLM 22B Instruct',
    base: 'utter-project/EuroLLM-22B-Instruct-2512',
    provider: 'Utter Project (EU consortium)',
    license: 'Apache-2.0',
    provenance_url:
      'https://github.com/L-electron-Rare/eu-kiki/blob/main/docs/provenance/eurollm-22b-instruct-2512.json',
  },
  {
    alias: 'eu-kiki/gemma3-4b',
    display: 'Gemma 3 4B IT',
    base: 'google/gemma-3-4b-it',
    provider: 'Google DeepMind',
    license: 'Gemma Terms of Use',
    provenance_url:
      'https://github.com/L-electron-Rare/eu-kiki/blob/main/docs/provenance/gemma3-4b-it.json',
    notes: 'Light-weight worker — runs on tower (NVIDIA Quadro P2000 5 GB).',
  },
  {
    alias: 'eu-kiki/qwen3-next-80b-a3b-instruct',
    display: 'Qwen3-Next 80B A3B Instruct',
    base: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
    provider: 'Qwen (Alibaba Cloud)',
    license: 'Apache-2.0',
    provenance_url:
      'https://github.com/L-electron-Rare/eu-kiki/blob/main/docs/provenance/qwen3-next-80b-a3b-instruct.json',
    notes: 'MoE 80B / 3B active. Runs on kxkm-ai (RTX 4090) via llama.cpp with expert offload to RAM.',
  },
  {
    alias: 'eu-kiki/auto',
    display: 'Auto-router (MiniLM + MLP head)',
    base: 'sentence-transformers/all-MiniLM-L6-v2 + internal head',
    provider: 'Microsoft (encoder) + L\'Électron Rare (head)',
    license: 'Apache-2.0',
    provenance_url:
      'https://github.com/L-electron-Rare/eu-kiki/blob/main/docs/provenance/auto-router-minilm.json',
    notes: 'Routing classifier only — no chat output of its own.',
  },
  {
    alias: '(routing fallback) Gemma 3 4B IT',
    display: 'Gemma 3 4B IT — fallback worker',
    base: 'google/gemma-3-4b-it',
    provider: 'Google',
    license: 'Gemma Terms',
    provenance_url:
      'https://github.com/L-electron-Rare/eu-kiki/blob/main/docs/provenance/gemma-3-4b-it.json',
    notes: 'Used only by the auto-router as a quick fallback when no labelled domain matches.',
  },
];

function TransparencyPage() {
  return (
    <article className="max-w-4xl mx-auto prose prose-slate">
      <h1>Transparency &amp; provenance</h1>

      <p>
        This site is operated by <strong>L'Électron Rare</strong> as a public showcase of an
        EU-sovereign LLM stack. It is subject to the EU Artificial Intelligence Act (Regulation
        (EU) 2024/1689). The disclosures below cover Article 50 (transparency for users) and
        Annex IV (technical documentation).
      </p>

      <h2>You are interacting with an AI</h2>
      <p>
        Every chat reply on this site is produced by a Large Language Model. Outputs may be
        inaccurate, biased or fabricated. They are not professional advice. Do not act on a
        reply without independent verification, especially in regulated domains (health, law,
        finance, safety-critical engineering).
      </p>

      <h2>Models served</h2>
      <table className="text-sm">
        <thead>
          <tr>
            <th>Alias</th>
            <th>Base model</th>
            <th>Provider</th>
            <th>Licence</th>
            <th>Provenance</th>
          </tr>
        </thead>
        <tbody>
          {ENTRIES.map((e) => (
            <tr key={e.alias}>
              <td>
                <code>{e.alias}</code>
                {e.notes && <p className="text-xs text-slate-500 mt-1">{e.notes}</p>}
              </td>
              <td>
                <code>{e.base}</code>
              </td>
              <td>{e.provider}</td>
              <td>{e.license}</td>
              <td>
                <a href={e.provenance_url} target="_blank" rel="noopener noreferrer">
                  JSON ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>What we record per model</h2>
      <ul>
        <li>Source repository and the exact upstream commit SHA we pinned to</li>
        <li>Licence (SPDX identifier where applicable)</li>
        <li>Architecture, total parameters, active parameters per token</li>
        <li>Quantisation method and who produced it</li>
        <li>Any post-download modification (LoRA fine-tunes, merges, distillation)</li>
        <li>Intended use and out-of-scope use cases</li>
      </ul>

      <h2>LoRA adapters published on HuggingFace</h2>
      <p>
        We publish ~25 domain-specific LoRA adapters under{' '}
        <a href="https://huggingface.co/clemsail" target="_blank" rel="noopener noreferrer">
          clemsail
        </a>{' '}
        and{' '}
        <a href="https://huggingface.co/electron-rare" target="_blank" rel="noopener noreferrer">
          electron-rare
        </a>
        . Each adapter ships a model card declaring its base model, training data summary, and
        intended use, in line with Article 53 obligations for general-purpose AI providers.
      </p>

      <h2>Training data &amp; copyright</h2>
      <p>
        Adapters are trained on a mix of L'Électron Rare in-house corpora (synthetic distillation
        from Claude Opus reasoning traces, public technical documentation, manually curated
        prompts) and licensed open datasets. We do not knowingly train on scraped copyrighted
        material; opt-out signals (robots.txt, ai.txt) are respected for any web data. The
        full per-dataset breakdown lives in{' '}
        <a
          href="https://github.com/L-electron-Rare/eu-kiki/tree/main/docs/transparency"
          target="_blank"
          rel="noopener noreferrer"
        >
          docs/transparency/
        </a>{' '}
        of the eu-kiki repository.
      </p>

      <h2>Logs &amp; data retention</h2>
      <p>
        The cockpit API logs request metadata (timestamp, model alias, token counts, response
        latency) for ≤ 30 days for operational debugging and rate-limit enforcement. Prompt
        and reply <strong>content</strong> is not persisted to disk by default. Streaming chat
        sessions only live in volatile memory.
      </p>

      <h2>Contact &amp; right to opt out</h2>
      <p>
        Reports of biased output, copyright concerns, or any other AI Act issue: email{' '}
        <a href="mailto:postmaster@saillant.cc">postmaster@saillant.cc</a>. We aim to respond
        within 7 working days.
      </p>
    </article>
  );
}

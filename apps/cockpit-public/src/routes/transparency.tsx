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
    alias: 'ailiance/apertus-70b',
    display: 'Apertus 70B Instruct',
    base: 'swiss-ai/Apertus-70B-Instruct-2509',
    provider: 'Swiss AI Initiative (EPFL/ETHZ/CSCS)',
    license: 'Apache-2.0',
    provenance_url:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/apertus-70b-instruct-2509.json',
  },
  {
    alias: 'ailiance/devstral-24b',
    display: 'Devstral Small 2 24B Instruct',
    base: 'mistralai/Devstral-Small-2-24B-Instruct-2512',
    provider: 'Mistral AI',
    license: 'Apache-2.0',
    provenance_url:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/devstral-small-2-24b-instruct-2512.json',
  },
  {
    alias: 'ailiance/eurollm-22b',
    display: 'EuroLLM 22B Instruct',
    base: 'utter-project/EuroLLM-22B-Instruct-2512',
    provider: 'Utter Project (EU consortium)',
    license: 'Apache-2.0',
    provenance_url:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/eurollm-22b-instruct-2512.json',
  },
  {
    alias: 'ailiance/gemma3-4b',
    display: 'Gemma 3 4B IT',
    base: 'google/gemma-3-4b-it',
    provider: 'Google DeepMind',
    license: 'Gemma Terms of Use',
    provenance_url:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/gemma3-4b-it.json',
    notes: 'Light-weight worker — runs on tower (NVIDIA Quadro P2000 5 GB).',
  },
  {
    alias: 'ailiance/qwen3-next-80b-a3b-instruct',
    display: 'Qwen3-Next 80B A3B Instruct',
    base: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
    provider: 'Qwen (Alibaba Cloud)',
    license: 'Apache-2.0',
    provenance_url:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/qwen3-next-80b-a3b-instruct.json',
    notes:
      'MoE 80B / 3B active. Runs on kxkm-ai (RTX 4090) via llama.cpp with expert offload to RAM.',
  },
  {
    alias: 'ailiance/auto',
    display: 'Auto-router (MiniLM + MLP head)',
    base: 'sentence-transformers/all-MiniLM-L6-v2 + internal head',
    provider: "Microsoft (encoder) + Ailiance (head)",
    license: 'Apache-2.0',
    provenance_url:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/auto-router-minilm.json',
    notes:
      'Routing classifier + chain dispatcher. As of router v0.3 (May 2026) it also auto-engages the Deliberation chain (LLM → sandboxed validator → reflector retry) when the classified domain has a non-direct policy in chain_policies.yaml. See "Router v0.3 — agentic chain" below.',
  },
  {
    alias: '(routing fallback) Gemma 3 4B IT',
    display: 'Gemma 3 4B IT — fallback worker',
    base: 'google/gemma-3-4b-it',
    provider: 'Google',
    license: 'Gemma Terms',
    provenance_url:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/gemma-3-4b-it.json',
    notes:
      'Health-gated fallback: if the classified worker is unreachable, the gateway routes to Gemma rather than 500. Also the canonical home for short generalist domains (general, quick, summarize, classification, tldr).',
  },
];

function TransparencyPage() {
  return (
    <article className="max-w-4xl mx-auto prose prose-slate">
      <h1>Transparency &amp; provenance</h1>

      <p>
        This site is operated by <strong>Ailiance</strong> as a public showcase of an
        EU-sovereign LLM stack. It is subject to the EU Artificial Intelligence Act (Regulation (EU)
        2024/1689). The disclosures below cover Article 50 (transparency for users) and Annex IV
        (technical documentation).
      </p>

      <h2>You are interacting with an AI</h2>
      <p>
        Every chat reply on this site is produced by a Large Language Model. Outputs may be
        inaccurate, biased or fabricated. They are not professional advice. Do not act on a reply
        without independent verification, especially in regulated domains (health, law, finance,
        safety-critical engineering).
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
        Adapters are trained on a mix of Ailiance in-house corpora (synthetic distillation
        from Claude Opus reasoning traces, public technical documentation, manually curated prompts)
        and licensed open datasets. We do not knowingly train on scraped copyrighted material;
        opt-out signals (robots.txt, ai.txt) are respected for any web data. The full per-dataset
        breakdown lives in{' '}
        <a
          href="https://github.com/ailiance/ailiance/tree/main/docs/transparency"
          target="_blank"
          rel="noopener noreferrer"
        >
          docs/transparency/
        </a>{' '}
        of the ailiance repository.
      </p>

      <h2>Logs &amp; data retention</h2>
      <p>
        The cockpit API logs request metadata (timestamp, model alias, token counts, response
        latency) for ≤ 30 days for operational debugging and rate-limit enforcement. Prompt and
        reply <strong>content</strong> is not persisted to disk by default. Streaming chat sessions
        only live in volatile memory.
      </p>

      <h2>
        Audit-grade benchmark — <code>iact-bench v0.2.0</code>
      </h2>
      <p>
        Capability and reliability of every model in our catalogue is measured by{' '}
        <a
          href="https://github.com/electron-rare/iact-bench"
          target="_blank"
          rel="noopener noreferrer"
        >
          iact-bench
        </a>{' '}
        — an audit-grade evaluation harness aligned with EU AI Act Article 53(1)(d) and Annex XI.
        The matrix runs <strong>31 canonical domains × ≤ 23 GPAI-eligible models</strong> with a
        triple metric: perplexity + task-score + LLM-judge + <strong>sandboxed validators</strong>.
        For each cell we record:
      </p>
      <ul>
        <li>
          <code>run_id</code>, <code>git_sha</code>, <code>methodology</code> version (currently{' '}
          <code>v1</code>)
        </li>
        <li>
          <code>prompt_hash</code> and <code>output_hash</code> (sha256)
        </li>
        <li>
          <code>seed</code> (crc32 deterministic per cell + sample index)
        </li>
        <li>
          <code>validator_image_digest</code> — pinned sha256 of the Docker image used
        </li>
        <li>
          <code>validator_exit_code</code>, truncated stdout/stderr — for reproducible re-runs
        </li>
      </ul>
      <p>
        Validators run inside Docker sandboxes with{' '}
        <code>--network=none --read-only --user 1000:1000 --cap-drop=ALL</code>, which makes the
        model output the <em>sole</em> input to the validator: no data exfiltration, no environment
        leakage. Twelve validators are sandbox-stable today (g++, arm-none-eabi-gcc, cargo embedded,
        shellcheck, tsc, ngspice, KiCad DRC/ERC, FreeCAD scripting, html5lib strict, sqlglot,
        JSON/YAML); ten additional v0.3 EDA/MCAD-as-code validators (SKiDL, tscircuit,
        Circuit-Synth, Xyce, Lcapy, CadQuery, build123d, OpenSCAD, JSCAD, ImplicitCAD) ship in
        v0.3.0.
      </p>
      <p>
        The full methodology document, audit walkthrough, and EU sovereignty charter live in{' '}
        <a
          href="https://github.com/electron-rare/iact-bench/blob/master/docs/methodology/2026-05-10-iact-bench-methodology-v1.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          docs/methodology/v1.md
        </a>
        . An external auditor can pull any pinned validator image by digest, replay any cell trace,
        and verify the recorded score byte-for-byte.
      </p>

      <h2>Router v0.3 — agentic chain orchestration</h2>
      <p>
        Calls to <code>model: "ailiance"</code> (the bare auto-router alias) are not 1-shot proxies.
        Since router v0.3 (shipped May 2026) the gateway looks up a per-domain{' '}
        <strong>chain policy</strong> and, on hardware/code domains, runs the model output through a
        sandboxed iact-bench validator before returning. If the validator rejects the output (e.g.{' '}
        <code>kicad-cli pcb drc</code> exit-non-zero on a generated PCB), a <em>reflector</em>{' '}
        prompt is emitted with the validator stderr and a retry is attempted. The full per-step
        trace is recorded as audit-grade NDJSON.
      </p>
      <p>
        Per-domain policies live in{' '}
        <a
          href="https://github.com/ailiance/ailiance/blob/main/configs/chain_policies.yaml"
          target="_blank"
          rel="noopener noreferrer"
        >
          configs/chain_policies.yaml
        </a>
        . Hardware and engineering domains use <code>deliberate</code> (LLM → validator → reflector
        retry). Math, translation, and generalist domains stay <code>direct</code> (1-shot).
        Streaming requests silently degrade to <code>direct</code> so existing SSE clients are not
        broken. Callers can override per request via OpenAI <code>extra_body.chain_policy</code>.
      </p>
      <p>
        For each chain run the gateway records, under <code>audit/chains/&lt;chain_id&gt;/</code>:
      </p>
      <ul>
        <li>
          <code>cells.ndjson</code> — one line per step (LLM call, validator run, reflector retry)
          with timestamps, exit codes, truncated stderr, image digests
        </li>
        <li>
          <code>manifest.json</code> — chain id, policy, domain, tool, validator backend identity,
          and the iact-bench submodule SHA the gateway was running against (so an auditor can clone
          the exact validator code that produced the trace)
        </li>
      </ul>
      <p>
        Counter <code>ailiance_gw_requests_total</code> is labelled by <code>path</code> (
        <code>chain</code>, <code>proxy</code>, <code>stream</code>) and <code>auto</code> (
        <code>1</code> when the chain was auto-engaged from the YAML map, <code>0</code> for
        explicit opt-in or the legacy 1-shot proxy). External monitoring can therefore distinguish
        chained from un-chained traffic without scraping logs.
      </p>
      <p>
        The chain orchestrator design and the four RecursiveMAS-inspired patterns it draws on
        (Sequential, Mixture, Distillation, Deliberation) are documented in{' '}
        <a
          href="https://github.com/ailiance/ailiance/blob/main/docs/router-v0.3-deliberate.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          docs/router-v0.3-deliberate.md
        </a>{' '}
        and the design plan{' '}
        <a
          href="https://github.com/ailiance/ailiance/blob/main/docs/plans/2026-05-11-router-agentic-v0.3.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          docs/plans/2026-05-11-router-agentic-v0.3.md
        </a>
        . Today only the Deliberation pattern is shipped (v0.3.0); Mixture (cross-judge live) is the
        v0.3.1 milestone, Sequential (planner + multi-step solver) is v0.4.
      </p>

      <h2>Contact &amp; right to opt out</h2>
      <p>
        Reports of biased output, copyright concerns, or any other AI Act issue: email{' '}
        <a href="mailto:postmaster@saillant.cc">postmaster@saillant.cc</a>. We aim to respond within
        7 working days.
      </p>
    </article>
  );
}

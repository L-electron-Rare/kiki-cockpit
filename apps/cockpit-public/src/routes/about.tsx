import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return (
    <article className="max-w-3xl mx-auto prose">
      <h1>About this showcase</h1>
      <p>
        L'Électron Rare's LLM fleet is fine-tuned on Apple Silicon (Mac Studio M3 Ultra, 512 GB
        unified memory) using MLX. We distill Claude Opus reasoning into open-source models and
        publish provenance-traceable adapters under Apache-2.0.
      </p>
      <h2>EU AI Act Article 52/53 transparency</h2>
      <p>
        Each model published with full provenance: base model, training method (LoRA / SFT),
        hyperparameters, datasets (HF-traceable, licensed Apache/MIT/CC-BY), hardware, run SHA. See{' '}
        <a href="https://github.com/L-electron-Rare/eu-kiki/blob/main/docs/eu-ai-act-transparency.md">
          the EU-KIKI transparency document
        </a>
        .
      </p>
      <h2>Stack</h2>
      <ul>
        <li>
          Training: MLX bf16 LoRA on Mistral Large 123B, Qwen3.5-122B/35B, Apertus 70B, Devstral
          24B, EuroLLM 22B
        </li>
        <li>Routing: Jina v3 embeddings + MLP classifier (40 domains)</li>
        <li>Serving: 3-worker FastAPI gateway, BF16, shared memory pool</li>
        <li>Evaluation: Lighteval + EvalPlus + MT-Bench + KIKI-native (KiCad/SPICE/EMC/MISRA)</li>
      </ul>
    </article>
  );
}

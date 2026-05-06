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
        <a href="https://github.com/L-electron-Rare/ailiance/blob/main/docs/eu-ai-act-transparency.md">
          the AILIANCE transparency document
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
      <h2>Portable backend</h2>
      <p>
        The ailiance gateway and worker stack are <strong>not tied to Apple Silicon</strong>.
        Our reference deployment runs on Mac Studio M3 Ultra (MLX) and macOS via MLX-LM and
        llama.cpp, but the same OpenAI-compatible HTTP contract can be served from any
        runtime that exposes a compatible <code>/v1/chat/completions</code> endpoint.
        Confirmed-working backends:
      </p>
      <ul>
        <li><strong>Apple Silicon (arm64)</strong> — MLX / MLX-LM (reference), llama.cpp Metal</li>
        <li><strong>NVIDIA CUDA (x86_64 / arm64)</strong> — vLLM, TGI, llama.cpp CUDA, Ollama</li>
        <li><strong>AMD ROCm (x86_64)</strong> — vLLM ROCm, llama.cpp HIP</li>
        <li><strong>Intel / generic x86_64</strong> — llama.cpp CPU/AVX2/AVX-512, OpenVINO</li>
        <li><strong>ARM CPU (Linux arm64, e.g. Graviton, Ampere)</strong> — llama.cpp NEON</li>
      </ul>
      <p>
        Models published in <a href="https://huggingface.co/clemsail">our HuggingFace org</a> are
        distributed in formats that cover this matrix: MLX safetensors (Apple Silicon), GGUF
        quantizations (llama.cpp, all platforms), and base bf16 safetensors (vLLM / TGI). The
        gateway, router, and provenance pipeline are pure Python / FastAPI and run anywhere
        Python 3.12+ is available.
      </p>
    </article>
  );
}

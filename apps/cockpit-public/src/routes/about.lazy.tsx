import { createLazyFileRoute } from '@tanstack/react-router';

export const Route = createLazyFileRoute('/about')({
  component: AboutPage,
});

const BACKENDS = [
  { plat: 'Apple Silicon (arm64)', be: 'MLX / MLX-LM (référence), llama.cpp Metal' },
  { plat: 'NVIDIA CUDA (x86_64 / arm64)', be: 'vLLM, TGI, llama.cpp CUDA, Ollama' },
  { plat: 'AMD ROCm (x86_64)', be: 'vLLM ROCm, llama.cpp HIP' },
  { plat: 'Intel / x86_64 générique', be: 'llama.cpp CPU/AVX2/AVX-512, OpenVINO' },
  { plat: 'ARM CPU (Linux arm64, Graviton, Ampere)', be: 'llama.cpp NEON' },
  { plat: 'Pure Python anywhere', be: 'FastAPI gateway + router (Python 3.12+)' },
];

function AboutPage() {
  return (
    <main>
      <section className="wrap page-head">
        <div className="kicker">
          <span className="num">№ 06</span> · Ailiance software
        </div>
        <h1 className="display">
          Pourquoi <em>cette</em> flotte.
        </h1>
      </section>

      <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <article className="prose">
          <p className="lede">
            La flotte LLM Ailiance software est fine-tunée sur Apple Silicon (Mac Studio M3 Ultra,
            512 Go de mémoire unifiée) avec MLX. Nous distillons les traces de raisonnement de
            Claude Opus dans des modèles open-source, et publions des adaptateurs traçables sous
            Apache-2.0 ou autres licences adaptées au modèle de base.
          </p>

          <h2>Stack technique</h2>
          <ul>
            <li>
              <strong>Entraînement</strong> — MLX bf16 LoRA sur Mistral Large 123B,
              Qwen3.5-122B/35B, Apertus 70B, Devstral 24B, EuroLLM 22B
            </li>
            <li>
              <strong>Routage</strong> — embeddings MiniLM L6 v2 384d + classifier MLP (40 domaines
              prédits, 5 fallback) avec cache deux niveaux (L1 hash + L2 sémantique)
            </li>
            <li>
              <strong>Orchestration</strong> — <strong>router v0.3 Deliberation chain</strong> :
              auto-engagé sur <code>model: "ailiance"</code> pour les domaines hardware / code, fait
              passer la sortie LLM dans un validator iact-bench sandboxé, retry avec feedback stderr
              en cas d'échec, émet NDJSON audit par chaîne
            </li>
            <li>
              <strong>Serving</strong> — gateway FastAPI multi-worker, BF16, pool mémoire partagé
            </li>
            <li>
              <strong>Évaluation</strong> — Lighteval + EvalPlus + MT-Bench + iact-bench v0.2.0 (31
              domaines × 23 modèles, 25 validators Docker sandboxés)
            </li>
          </ul>

          <h2>Backend portable</h2>
          <p>
            La gateway ailiance et la stack workers ne sont{' '}
            <strong>pas liées à Apple Silicon</strong>. Notre déploiement de référence tourne sur
            Mac Studio M3 Ultra (MLX) et macOS via MLX-LM et llama.cpp, mais le même contrat HTTP
            OpenAI-compatible peut être servi depuis n'importe quel runtime exposant{' '}
            <code>/v1/chat/completions</code>.
          </p>

          <div className="backends-grid">
            {BACKENDS.map((b) => (
              <div
                key={b.plat}
                style={{
                  padding: '18px 22px',
                  borderBottom: '1px solid var(--rule)',
                  borderRight: '1px solid var(--rule)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'var(--ink-4)',
                  }}
                >
                  plateforme
                </div>
                <div
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 22,
                    lineHeight: 1.1,
                    margin: '4px 0 8px',
                  }}
                >
                  {b.plat}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                  {b.be}
                </div>
              </div>
            ))}
          </div>

          <h2>Sister projects</h2>
          <ul>
            <li>
              <a
                href="https://github.com/ailiance/ailiance"
                target="_blank"
                rel="noopener noreferrer"
              >
                ailiance
              </a>{' '}
              — la gateway LLM elle-même (workers, router-v6, dossier EU AI Act).
            </li>
            <li>
              <a
                href="https://github.com/ailiance/ailiance-agent"
                target="_blank"
                rel="noopener noreferrer"
              >
                ailiance-agent
              </a>{' '}
              — agent de code (CLI <code>aki</code> + extension VS Code) qui pointe sur cette
              gateway par défaut.
            </li>
            <li>
              <a
                href="https://github.com/ailiance/ailiance-bench"
                target="_blank"
                rel="noopener noreferrer"
              >
                ailiance-bench
              </a>{' '}
              — le harnais d'évaluation audit-grade utilisé pour scorer chaque modèle servi.
            </li>
          </ul>

          <h2>Organisation des responsabilités</h2>
          <p>
            Trois pôles de responsabilité, séparés au sein de l'équipe Ailiance software pour
            permettre la traçabilité et la séparation des contrôles attendues par l'Article 17 IA
            Act (Quality Management System) :
          </p>
          <ul>
            <li>
              <strong>Équipe Data</strong> — collecte, curation, audit
              qualité/biais/représentativité des corpus, exécution iact-bench, gestion des datasets
              HuggingFace <code>Ailiance-fr/</code>. Responsable du <em>bloc 3 et 5</em> de la
              démarche qualité.
            </li>
            <li>
              <strong>Conformité &amp; Sécurité</strong> — veille réglementaire (AI Act, RGPD, CRA),
              tenue du registre d'incidents (
              <a href="mailto:incidents@ailiance.fr">incidents@ailiance.fr</a>), audit interne
              semestriel, publication des post-mortems. Responsable du <em>bloc 6</em> de la
              démarche qualité et du dossier Annex IV.
            </li>
            <li>
              <strong>Direction technique</strong> — architecture gateway / routeur / validators,
              arbitrage des releases, signature des commits de provenance, validation finale des
              critères de release. Responsable du <em>bloc 4</em> et de la chaîne de signature.
            </li>
          </ul>
          <p
            style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-4)', marginTop: 8 }}
          >
            Contact direction : <a href="mailto:contact@ailiance.fr">contact@ailiance.fr</a>
          </p>

          <h2>Licence</h2>
          <p>Apache-2.0, sur l'ensemble du code et des adaptateurs.</p>
        </article>
      </section>
    </main>
  );
}

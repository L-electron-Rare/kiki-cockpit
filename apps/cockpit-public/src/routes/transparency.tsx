import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/transparency')({
  component: TransparencyPage,
});

interface ProvenanceEntry {
  alias: string;
  base: string;
  provider: string;
  license: string;
  provenanceUrl: string;
  notes?: string;
}

const ENTRIES: ProvenanceEntry[] = [
  {
    alias: 'ailiance/apertus-70b',
    base: 'swiss-ai/Apertus-70B-Instruct-2509',
    provider: 'Swiss AI Initiative (EPFL/ETHZ/CSCS)',
    license: 'Apache-2.0',
    provenanceUrl:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/apertus-70b-instruct-2509.json',
  },
  {
    alias: 'ailiance/devstral-24b',
    base: 'mistralai/Devstral-Small-2-24B-Instruct-2512',
    provider: 'Mistral AI',
    license: 'Apache-2.0',
    provenanceUrl:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/devstral-small-2-24b-instruct-2512.json',
  },
  {
    alias: 'ailiance/eurollm-22b',
    base: 'utter-project/EuroLLM-22B-Instruct-2512',
    provider: 'Utter Project (consortium EU)',
    license: 'Apache-2.0',
    provenanceUrl:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/eurollm-22b-instruct-2512.json',
  },
  {
    alias: 'ailiance/gemma3-4b',
    base: 'google/gemma-3-4b-it',
    provider: 'Google DeepMind',
    license: 'Gemma Terms',
    provenanceUrl:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/gemma-3-4b-it.json',
    notes: 'Worker léger · NVIDIA Quadro P2000 5 GB',
  },
  {
    alias: 'ailiance/qwen3-next-80b',
    base: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
    provider: 'Qwen · Alibaba Cloud',
    license: 'Apache-2.0',
    provenanceUrl:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/qwen3-next-80b-a3b-instruct.json',
    notes: 'MoE 80B / 3B actif · RTX 4090 + RAM offload',
  },
  {
    alias: 'ailiance/auto',
    base: 'Jina v3 embeddings + MLP head + chain orchestrator',
    provider: 'Jina AI + Ailiance software',
    license: 'Apache-2.0',
    provenanceUrl:
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/auto-router-minilm.json',
    notes: 'Classifier 32 domaines · chain v0.3',
  },
];

function TransparencyPage() {
  return (
    <main>
      <section className="wrap page-head">
        <div className="kicker">
          <span className="num">№ 03</span> · EU AI Act · Règlement (UE) 2024/1689
        </div>
        <h1 className="display">
          Démarche Qualité <em>IA Act</em>.
        </h1>
      </section>

      <section className="wrap" style={{ paddingTop: 48 }}>
        <article className="prose">
          <p className="lede">
            Ce site est exploité par <strong>Ailiance software</strong> comme vitrine publique d'une
            infrastructure LLM européenne. Il relève du règlement (UE) 2024/1689. Les six blocs
            ci-dessous décrivent notre démarche qualité : documentation technique, information
            intégrateurs, résumé des données, procédure de validation, vérification des biais, et
            mécanisme d'incidents.{' '}
            <em>
              L'obligation d'information d'utilisation IA (Article 50) apparaît dès l'accueil.
            </em>
          </p>

          {/* 1. Documentation technique */}
          <h2>1 · Documentation technique actualisée par modèle</h2>
          <p>
            Chaque modèle servi expose un fichier JSON de provenance Annex IV §1(c) couvrant son
            entraînement, ses tests et ses résultats — publié dans{' '}
            <code>ailiance/ailiance/docs/provenance/</code>, daté et signé par commit Git.
          </p>
          <ul>
            <li>
              <strong>Entraînement</strong> — repository source, SHA upstream, méthode (LoRA bf16
              MLX, distillation, quantization), hyperparamètres, durée et coût matériel
            </li>
            <li>
              <strong>Tests</strong> — suites Lighteval / EvalPlus / MT-Bench / iact-bench avec
              git_sha et methodology pinned
            </li>
            <li>
              <strong>Résultats</strong> — scores par domaine, perplexité, task-score, LLM-judge, et
              validator exit-codes — toutes les cellules rejouables byte-à-byte
            </li>
          </ul>

          <table className="prov-table">
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
                    {e.notes && <div className="notes">{e.notes}</div>}
                  </td>
                  <td>
                    <code>{e.base}</code>
                  </td>
                  <td>{e.provider}</td>
                  <td>{e.license}</td>
                  <td>
                    <a href={e.provenanceUrl} target="_blank" rel="noopener noreferrer">
                      JSON ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 2. Information intégrateurs */}
          <h2>2 · Information pour intégrateurs — capacités et limites</h2>
          <p>
            Chaque model card HuggingFace déclare explicitement les capacités prévues et les limites
            — conformément à l'Article 53 pour les fournisseurs de modèles GPAI.
          </p>
          <ul>
            <li>
              <strong>Capacités</strong> — domaines de spécialisation (KiCad, ngspice, embarqué,
              droit FR, médical EU, math), langue(s) supportées, longueur de contexte maximale,
              modes (chat, code, raisonnement)
            </li>
            <li>
              <strong>Limites</strong> — cas hors-périmètre, modes connus de défaillance
              (hallucination de pin-out, confusion d'unités, biais culturels), seuils de confiance
              recommandés
            </li>
            <li>
              <strong>Pré-requis matériels</strong> — quantization disponible, mémoire minimale,
              débit attendu sur backend de référence
            </li>
            <li>
              <strong>Intégration</strong> — endpoint OpenAI-compatible{' '}
              <code>/v1/chat/completions</code>, exemples d'appel curl/Python, paramètres
              recommandés par cas d'usage
            </li>
          </ul>

          {/* 3. Résumé du contenu d'entraînement */}
          <h2>3 · Résumé compréhensible du contenu utilisé en entraînement</h2>
          <p>
            Pour chaque adaptateur publié, nous fournissons un résumé en français accessible (pas
            uniquement un dump technique) :
          </p>
          <ul>
            <li>
              <strong>Sources principales</strong> — corpus internes Ailiance software (distillation
              synthétique de traces Claude Opus, documentation technique publique, prompts curés
              manuellement) et jeux de données ouverts sous licence (Stack Exchange, KiCad upstream,
              Wikipédia, Common Crawl filtré)
            </li>
            <li>
              <strong>Volume et composition</strong> — nombre approximatif d'exemples, distribution
              par langue, distribution par domaine
            </li>
            <li>
              <strong>Exclusions</strong> — contenus protégés non utilisés sciemment, respect des
              signaux d'opt-out (robots.txt, ai.txt) pour les données web
            </li>
            <li>
              <strong>Période de collecte</strong> — bornes temporelles des sources
            </li>
          </ul>

          {/* 4. Procédure de conception et validation */}
          <h2>4 · Procédure documentée de conception et de validation</h2>
          <p>
            La méthodologie iact-bench v1 est versionnée et exécutable. Chaque release d'un modèle
            suit une procédure formelle reproductible :
          </p>
          <ul>
            <li>
              <strong>Conception</strong> — sélection du modèle base, justification de la méthode
              (LoRA vs full fine-tune vs distillation), choix des hyperparamètres documenté dans le
              fichier de provenance
            </li>
            <li>
              <strong>Validation pré-publication</strong> — iact-bench complet (31 domaines × 23
              modèles) + sandbox Docker validators (g++, KiCad DRC/ERC, ngspice, shellcheck, tsc,
              etc.) avec digests sha256 épinglés
            </li>
            <li>
              <strong>Critères de release</strong> — gain mesurable sur le domaine cible vs base
              model, absence de régression critique sur les autres domaines, validator exit-zero sur
              ≥ 80% des cellules domain-critical
            </li>
            <li>
              <strong>Trace d'audit</strong> — NDJSON par run avec <code>run_id</code>,{' '}
              <code>git_sha</code>, <code>seed</code>, <code>validator_image_digest</code>,{' '}
              <code>prompt_hash</code> et <code>output_hash</code>
            </li>
          </ul>

          {/* 5. Vérification des données */}
          <h2>5 · Processus de vérification des données d'entraînement</h2>
          <p>Trois axes contrôlés systématiquement avant fine-tuning :</p>
          <ul>
            <li>
              <strong>Qualité</strong> — dédup near-duplicate (MinHash), filtrage des artefacts
              (HTML résiduel, encodage cassé, tronqué), validation syntaxique pour les corpus
              code/JSON/YAML, score de cohérence sur échantillon stratifié
            </li>
            <li>
              <strong>Biais</strong> — audit sur axes protégés (genre, origine, opinion politique,
              religion) via classifiers ouverts, comparaison de la distribution corpus vs
              distribution attendue, alerte si écart-type {'>'} 2σ
            </li>
            <li>
              <strong>Représentativité</strong> — couverture des sous-domaines techniques (par
              exemple en KiCad : symboles vs footprints vs schémas vs PCB layout), équilibrage
              langue FR / EN, équilibrage difficulté (basique → expert)
            </li>
          </ul>
          <p>
            Les scripts de construction et d'audit des corpus sont publiés dans{' '}
            <a
              href="https://github.com/ailiance/ailiance/tree/main/scripts"
              target="_blank"
              rel="noopener noreferrer"
            >
              ailiance/scripts/
            </a>{' '}
            (par exemple <code>augment_router_data.py</code>, <code>build_hf_datasets.py</code>,{' '}
            <code>calibrate_threshold.py</code>, <code>fix_provenance.py</code>) et exécutés en CI à
            chaque mise à jour de corpus.
          </p>

          {/* 6. Mécanisme d'incidents */}
          <h2>6 · Mécanisme de remontée et de traitement des incidents</h2>
          <p>
            Un canal unique de remontée pour plaintes, erreurs, biais détectés ou préoccupations de
            droit d'auteur : <a href="mailto:incidents@ailiance.fr">incidents@ailiance.fr</a>.
          </p>
          <ul>
            <li>
              <strong>Réception</strong> — accusé sous 48 heures ouvrées, identifiant d'incident
              unique, qualification (plainte / erreur factuelle / biais / droit d'auteur / autre)
            </li>
            <li>
              <strong>Investigation</strong> — reproduction de la sortie incriminée si possible
              (NDJSON audit-grade contient prompt_hash + seed), analyse de la chaîne de provenance,
              identification du ou des modèles concernés
            </li>
            <li>
              <strong>Traitement</strong> — retrait temporaire du modèle si gravité élevée, patch
              dataset ou règle de routage si biais reproductible, ré-entraînement si nécessaire,
              mise à jour de la model card
            </li>
            <li>
              <strong>Communication</strong> — réponse documentée au plaignant sous 7 jours ouvrés,
              et publication d'un post-mortem anonymisé dans <code>docs/incidents/</code> si
              l'incident a entraîné un changement de modèle ou de politique
            </li>
            <li>
              <strong>Registre public</strong> — incidents par catégorie et délais de traitement
              publiés trimestriellement sur cette page
            </li>
          </ul>

          <div className="disclosure">
            <div>
              <div className="num">IV</div>
              <div className="label">Annexe</div>
            </div>
            <div>
              <h4>Sandbox des validators</h4>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                }}
              >
                docker run --network=none --read-only --user 1000:1000 --cap-drop=ALL
              </p>
              <p style={{ margin: '10px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>
                La sortie du modèle est <em>la seule entrée</em> du validator : pas d'exfiltration
                de données, pas de fuite d'environnement. Douze validators stables aujourd'hui (g++,
                arm-none-eabi-gcc, cargo embedded, shellcheck, tsc, ngspice, KiCad DRC/ERC, FreeCAD
                scripting, html5lib strict, sqlglot, JSON/YAML). Dix validators EDA/MCAD
                supplémentaires en v0.3.0.
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

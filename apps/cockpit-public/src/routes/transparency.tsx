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
      'https://github.com/ailiance/ailiance/blob/main/docs/provenance/gemma3-4b-it.json',
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
    base: 'MiniLM-L6 + MLP head + chain orchestrator',
    provider: "Microsoft + L'Électron Rare",
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
          <span className="num">№ 05</span> · EU AI Act · Règlement (UE) 2024/1689
        </div>
        <h1 className="display">
          Transparence &amp; <em>provenance</em>.
        </h1>
      </section>

      <section className="wrap" style={{ paddingTop: 48 }}>
        <article className="prose">
          <p className="lede">
            Ce site est exploité par <strong>L'Électron Rare</strong> comme vitrine publique d'une
            infrastructure LLM européenne. Il relève du règlement (UE) 2024/1689 sur
            l'intelligence artificielle. Les divulgations ci-dessous couvrent l'
            <strong>Article 50</strong> (transparence vis-à-vis des utilisateurs) et l'
            <strong>Annexe IV</strong> (documentation technique).
          </p>

          <div className="disclosure">
            <div>
              <div className="num">50</div>
              <div className="label">Article</div>
            </div>
            <div>
              <h4>Vous interagissez avec une IA.</h4>
              <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 15 }}>
                Chaque réponse de chat sur ce site est produite par un grand modèle de langage. Les
                sorties peuvent être inexactes, biaisées ou fabriquées. Elles ne constituent pas un
                avis professionnel. <strong>Ne pas agir</strong> sur une réponse sans vérification
                indépendante — en particulier dans les domaines régulés (santé, droit, finance,
                ingénierie critique).
              </p>
            </div>
          </div>

          <h2>Modèles servis</h2>
          <p>
            Six alias gateway. Chacun pointe vers un fichier JSON de provenance Annex IV §1(c)
            publié dans{' '}
            <code>ailiance/ailiance/docs/provenance/</code>.
          </p>

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

          <h2>Ce que nous documentons par modèle</h2>
          <ul>
            <li>Repository source et SHA exact du commit upstream sur lequel nous nous sommes figés</li>
            <li>Licence (identifiant SPDX où applicable)</li>
            <li>Architecture, paramètres totaux, paramètres actifs par token</li>
            <li>Méthode et auteur de la quantization</li>
            <li>Toute modification post-téléchargement (fine-tune LoRA, merge, distillation)</li>
            <li>Usages prévus et cas hors-périmètre</li>
          </ul>

          <h2>Adaptateurs LoRA publiés</h2>
          <p>
            Environ 25 adaptateurs spécialisés sous{' '}
            <a href="https://huggingface.co/Ailiance-fr" target="_blank" rel="noopener noreferrer">
              Ailiance-fr
            </a>
            . Chaque adaptateur expose une model card déclarant son modèle de base, un résumé des
            données d'entraînement, et un usage prévu — conformément aux obligations de l'Article 53
            pour les fournisseurs de GPAI.
          </p>

          <h2>Données d'entraînement &amp; droit d'auteur</h2>
          <p>
            Les adaptateurs sont entraînés sur un mélange de corpus internes L'Électron Rare
            (distillation synthétique de traces de raisonnement Claude Opus, documentation technique
            publique, prompts curés manuellement) et de jeux de données ouverts sous licence. Nous
            n'entraînons pas sciemment sur des contenus protégés ; les signaux d'opt-out (robots.txt,
            ai.txt) sont respectés pour toute donnée web.
          </p>

          <h2>Logs &amp; rétention</h2>
          <p>
            L'API cockpit log les métadonnées de requête (timestamp, alias modèle, comptage tokens,
            latence) pendant <strong>≤ 30 jours</strong> pour le débogage opérationnel et
            l'application des rate-limits. Le <strong>contenu des prompts et réponses</strong> n'est
            pas persisté sur disque par défaut. Les sessions de chat streaming ne vivent qu'en
            mémoire volatile.
          </p>

          <h2>
            Benchmark audit-grade —{' '}
            <code>iact-bench v0.2.0</code>
          </h2>
          <p>
            La capacité et la fiabilité de chaque modèle sont mesurées par{' '}
            <a
              href="https://github.com/electron-rare/iact-bench"
              target="_blank"
              rel="noopener noreferrer"
            >
              iact-bench
            </a>{' '}
            — un harnais d'évaluation aligné Article 53(1)(d) et Annexe XI. La matrice exécute{' '}
            <strong>31 domaines canoniques × ≤ 23 modèles GPAI-éligibles</strong> avec triple
            métrique : perplexité + task-score + LLM-judge +{' '}
            <strong>validators sandboxés</strong>.
          </p>
          <p>Pour chaque cellule nous enregistrons :</p>
          <ul>
            <li>
              <code>run_id</code>, <code>git_sha</code>, <code>methodology</code> (actuellement{' '}
              <code>v1</code>)
            </li>
            <li>
              <code>prompt_hash</code> et <code>output_hash</code> (sha256)
            </li>
            <li>
              <code>seed</code> (crc32 déterministe par cellule + index échantillon)
            </li>
            <li>
              <code>validator_image_digest</code> — sha256 épinglé de l'image Docker utilisée
            </li>
            <li>
              <code>validator_exit_code</code>, stdout/stderr tronqués — pour rejouer la cellule à
              l'identique
            </li>
          </ul>

          <h2>Router v0.3 — chaîne agentique</h2>
          <p>
            Les appels à <code>model: "ailiance"</code> (alias auto-router nu) ne sont pas des
            proxies à un coup. Depuis router v0.3 (mai 2026), la gateway consulte une{' '}
            <strong>politique de chaîne</strong> par domaine et, sur les domaines hardware / code,
            fait passer la sortie modèle par un validator iact-bench sandboxé avant retour. En cas
            de rejet (par exemple <code>kicad-cli pcb drc</code> exit non-zéro), un prompt{' '}
            <em>réflecteur</em> est émis avec le stderr du validator et une retry est tentée. La
            trace complète est enregistrée en NDJSON audit-grade.
          </p>
          <p>
            Les politiques par domaine vivent dans{' '}
            <a
              href="https://github.com/ailiance/ailiance/blob/main/configs/chain_policies.yaml"
              target="_blank"
              rel="noopener noreferrer"
            >
              configs/chain_policies.yaml
            </a>
            . Les domaines hardware et ingénierie utilisent <code>deliberate</code> (LLM → validator
            → reflector retry). Les domaines math, traduction et généraliste restent{' '}
            <code>direct</code> (1-shot).
          </p>

          <div className="disclosure">
            <div>
              <div className="num">IV</div>
              <div className="label">Annexe</div>
            </div>
            <div>
              <h4>Sandbox des validators</h4>
              <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>
                docker run --network=none --read-only --user 1000:1000 --cap-drop=ALL
              </p>
              <p style={{ margin: '10px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>
                La sortie du modèle est <em>la seule entrée</em> du validator : pas d'exfiltration
                de données, pas de fuite d'environnement. Douze validators sont stables aujourd'hui
                (g++, arm-none-eabi-gcc, cargo embedded, shellcheck, tsc, ngspice, KiCad DRC/ERC,
                FreeCAD scripting, html5lib strict, sqlglot, JSON/YAML). Dix validators
                EDA/MCAD-as-code supplémentaires arrivent en v0.3.0.
              </p>
            </div>
          </div>

          <h2>Contact &amp; droit d'opt-out</h2>
          <p>
            Signalements de sorties biaisées, préoccupations de droit d'auteur, ou toute autre
            question AI Act :{' '}
            <a href="mailto:postmaster@saillant.cc">postmaster@saillant.cc</a>. Délai de réponse
            cible : 7 jours ouvrés.
          </p>
        </article>
      </section>
    </main>
  );
}

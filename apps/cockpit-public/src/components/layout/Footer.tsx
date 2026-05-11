import { Link } from '@tanstack/react-router';

const BUILD_DATE = new Date().toISOString().slice(0, 10);

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="word">
              ail<em>i</em>ance
            </div>
            <p>
              Flotte LLM souveraine : plusieurs dizaines de modèles servis depuis du matériel
              personnel en France, exposés par tailnet, avec un dossier de conformité Annex IV par
              référence. Pas de dépendance cloud.
            </p>
          </div>
          <div>
            <h5>Produit</h5>
            <ul>
              <li>
                <Link to="/models">Modèles (playground + statut)</Link>
              </li>
              <li>
                <Link to="/about">À propos</Link>
              </li>
            </ul>
          </div>
          <div>
            <h5>Conformité</h5>
            <ul>
              <li>
                <Link to="/transparency">Démarche Qualité IA Act</Link>
              </li>
              <li>
                <a
                  href="https://github.com/ailiance/ailiance/tree/main/docs/provenance"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Provenance JSON
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ailiance/ailiance-bench"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Bench audit-grade
                </a>
              </li>
              <li>
                <Link to="/transparency">Politique de logs</Link>
              </li>
            </ul>
          </div>
          <div>
            <h5>Code</h5>
            <ul>
              <li>
                <a href="https://github.com/ailiance/ailiance">ailiance (gateway)</a>
              </li>
              <li>
                <a href="https://github.com/ailiance/ailiance-demo">ailiance-demo</a>
              </li>
              <li>
                <a href="https://huggingface.co/Ailiance-fr">huggingface · Ailiance-fr</a>
              </li>
              <li>
                <a href="https://github.com/ailiance">github · ailiance</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>Ailiance · Apache-2.0 · ailiance.fr</span>
          <span>build 34894c1 · {BUILD_DATE}</span>
        </div>
      </div>
    </footer>
  );
}

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
              Cinq workers. Vingt-quatre modèles. Un dossier de conformité par référence servie.
              Hébergé en France, exploité depuis un tailnet, sans dépendance cloud.
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
              {/* TODO: wire to real URLs (provenance bundle, iact-bench, log policy doc) */}
              <li>
                <a href="#">Provenance JSON</a>
              </li>
              <li>
                <a href="#">iact-bench v0.2</a>
              </li>
              <li>
                <a href="#">Politique de logs</a>
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

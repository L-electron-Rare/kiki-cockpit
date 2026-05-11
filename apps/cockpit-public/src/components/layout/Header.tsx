import { Link } from '@tanstack/react-router';

const NAV_ITEMS: [string, string][] = [
  ['/', 'Accueil'],
  ['/models', 'Modèles'],
  ['/transparency', 'Démarche Qualité IA Act'],
  ['/about', 'À propos'],
];

export function Header() {
  return (
    <header className="masthead">
      <div className="wrap masthead-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <svg
              viewBox="0 0 32 32"
              width="30"
              height="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="16" cy="16" r="14" />
              <path d="M4 16h24M16 4c4 4 4 20 0 24M16 4c-4 4-4 20 0 24" />
            </svg>
          </span>
          <span className="brand-word">
            ail<em>i</em>ance
          </span>
          <span className="brand-sub">
            <span>Flotte LLM</span>
            <span>souveraine</span>
          </span>
        </Link>
        <nav className="nav">
          {NAV_ITEMS.map(([path, label]) => (
            <Link key={path} to={path} activeProps={{ 'aria-current': 'page' }}>
              {label}
            </Link>
          ))}
          <span className="nav-flag">
            <i />
            <i />
            <i />
          </span>
        </nav>
      </div>
    </header>
  );
}

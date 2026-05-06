import { Link } from '@tanstack/react-router';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg">
          kiki-cockpit
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link to="/models" className="hover:underline">
            Models
          </Link>
          <Link to="/status" className="hover:underline">
            Status
          </Link>
          <Link to="/transparency" className="hover:underline">
            Transparency
          </Link>
          <Link to="/about" className="hover:underline">
            About
          </Link>
          <a
            href="https://huggingface.co/clemsail"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            HuggingFace ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

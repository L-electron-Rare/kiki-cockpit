export function Footer() {
  return (
    <footer className="border-t border-slate-200 mt-12">
      <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-slate-500">
        <p>
          L'Électron Rare — Apache-2.0 — Models on{' '}
          <a className="underline" href="https://huggingface.co/clemsail">
            clemsail
          </a>{' '}
          +{' '}
          <a className="underline" href="https://huggingface.co/electron-rare">
            electron-rare
          </a>
        </p>
        <p className="mt-1">
          Source:{' '}
          <a className="underline" href="https://github.com/L-electron-Rare">
            https://github.com/L-electron-Rare
          </a>
        </p>
      </div>
    </footer>
  );
}

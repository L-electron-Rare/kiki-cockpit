import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Topstrip } from '@/components/layout/Topstrip';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Suspense, lazy, useEffect } from 'react';

// Dev-only: the ternary folds to null in production (import.meta.env.DEV === false),
// so Vite tree-shakes the entire TweaksPanel module from the prod bundle.
const TweaksPanel = import.meta.env.DEV
  ? lazy(() => import('@/components/dev/TweaksPanel'))
  : null;

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        document.documentElement.dataset.theme = e.matches ? 'dark' : 'paper';
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Topstrip />
      <Header />
      <main
        className="wrap"
        style={{ flex: 1, paddingTop: 'var(--pad)', paddingBottom: 'var(--pad)' }}
      >
        <Outlet />
      </main>
      <Footer />
      {TweaksPanel && (
        <Suspense fallback={null}>
          <TweaksPanel />
        </Suspense>
      )}
    </div>
  );
}

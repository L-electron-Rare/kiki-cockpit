import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Topstrip } from '@/components/layout/Topstrip';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

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
    </div>
  );
}

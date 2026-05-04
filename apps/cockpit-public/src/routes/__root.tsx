import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Header />
      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

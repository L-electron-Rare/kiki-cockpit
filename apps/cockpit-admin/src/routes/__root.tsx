import { Link, Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-slate-100 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="font-bold">AILIANCE LLM Workflow · admin</h1>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="hover:underline">
              Dashboard
            </Link>
            <Link to="/training" className="hover:underline">
              Training
            </Link>
            <Link to="/workers" className="hover:underline">
              Workers
            </Link>
            <Link to="/eval" className="hover:underline">
              Eval
            </Link>
            <Link to="/datasets" className="hover:underline">
              Datasets
            </Link>
            <Link to="/benchmarks" className="hover:underline">
              Benchmarks
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-6 py-6 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}

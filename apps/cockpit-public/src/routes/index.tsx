import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div>
      <h2 className="text-3xl font-bold">L'Électron Rare — Model Showcase</h2>
      <p className="mt-2 text-slate-600">
        Foundation under construction. Sprint 1 brings the gallery and chat playground.
      </p>
    </div>
  );
}

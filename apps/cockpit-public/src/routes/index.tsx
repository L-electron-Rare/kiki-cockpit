import { ModelCard } from '@/components/ModelCard';
import { useModels } from '@/hooks/useModels';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { data: all, isLoading } = useModels();
  const featured = (all ?? [])
    .filter((c) => c.status === 'featured')
    .sort((a, b) => (a.featured_rank ?? 999) - (b.featured_rank ?? 999))
    .slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section>
        <h1 className="text-4xl font-bold">Ailiance — Model Showcase</h1>
        <p className="mt-2 text-slate-600">
          24 fine-tuned LLMs published on HuggingFace + 3 EU-sovereign models served live.
          Provenance, eval scores, and chat playground for the AILIANCE Live stack.
        </p>
        <div className="mt-4 flex gap-3">
          <Link to="/models" className="rounded bg-slate-900 px-4 py-2 text-white">
            Browse all models →
          </Link>
          <Link to="/about" className="rounded border border-slate-300 px-4 py-2">
            About
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Featured</h2>
        {isLoading ? (
          <p className="text-slate-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {featured.map((card) => (
              <ModelCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

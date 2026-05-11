import { ModelCard } from "@/components/ModelCard";
import { useModels } from "@/hooks/useModels";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: all, isLoading } = useModels();
  const featured = (all ?? [])
    .filter((c) => c.chat_eligible)
    .sort((a, b) => (a.featured_rank ?? 999) - (b.featured_rank ?? 999))
    .slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section>
        <h1 className="text-4xl font-bold">L'Électron Rare — Flotte LLM</h1>
        <p className="mt-2 text-slate-600">
          Modèles fine-tunés publiés sur HuggingFace, servis depuis nos machines en France.
          Provenance, scores d'évaluation et playground pour la flotte AILIANCE.
        </p>
        <div className="mt-4 flex gap-3">
          <Link to="/models" className="rounded bg-slate-900 px-4 py-2 text-white">
            Voir tous les modèles →
          </Link>
          <Link to="/transparency" className="rounded border border-slate-300 px-4 py-2">
            Transparence AI Act
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Modèles servis</h2>
        {isLoading ? (
          <p className="text-slate-500">Chargement…</p>
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

import { DatasetList } from '@/components/ModelDetail/DatasetList';
import { EvalScores } from '@/components/ModelDetail/EvalScores';
import { Provenance } from '@/components/ModelDetail/Provenance';
import { useEvalScores } from '@/hooks/useEvalScores';
import { useModelDetail } from '@/hooks/useModelDetail';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/models/$owner/$name')({
  component: ModelDetailPage,
});

function ModelDetailPage() {
  const { owner, name } = Route.useParams();
  const detail = useModelDetail(owner, name);
  const evals = useEvalScores(owner, name);

  if (detail.isLoading) return <p>Loading…</p>;
  if (detail.error || !detail.data) return <p>Model not found.</p>;
  const card = detail.data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{card.display_name}</h1>
        <p className="text-slate-500">{card.id}</p>
        {card.featured_headline && <p className="mt-2 italic">{card.featured_headline}</p>}
      </header>

      {card.chat_eligible ? (
        <Link
          to="/chat/$owner/$name"
          params={{ owner: card.owner, name: card.name }}
          className="inline-block rounded bg-emerald-600 px-6 py-2 font-medium text-white"
        >
          Try it →
        </Link>
      ) : (
        <a
          href={card.hf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded border border-slate-300 px-6 py-2 font-medium"
        >
          Try on HuggingFace →
        </a>
      )}

      <Provenance card={card} />
      <EvalScores summary={evals.data ?? null} />
      <DatasetList card={card} />
    </div>
  );
}

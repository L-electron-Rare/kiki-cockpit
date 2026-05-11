import { DatasetList } from '@/components/ModelDetail/DatasetList';
import { EvalScores } from '@/components/ModelDetail/EvalScores';
import { Provenance } from '@/components/ModelDetail/Provenance';
import { useEvalScores } from '@/hooks/useEvalScores';
import { useModelDetail } from '@/hooks/useModelDetail';
import { useProvenance } from '@/hooks/useProvenance';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/models/$owner/$name')({
  component: ModelDetailPage,
});

function ModelDetailPage() {
  const { owner, name } = Route.useParams();
  const id = `${owner}/${name}`;
  const detail = useModelDetail(owner, name);
  const evals = useEvalScores(owner, name);
  const provenance = useProvenance(id);

  if (detail.isLoading) return <p>Loading…</p>;
  if (detail.error || !detail.data) return <p>Model not found.</p>;
  const card = detail.data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <p className="text-xs text-slate-500">{card.id}</p>
        <h1 className="text-3xl font-bold">{card.display_name}</h1>
        {card.featured_headline && <p className="mt-2 italic text-slate-700">{card.featured_headline}</p>}
      </header>

      {card.description && <p className="text-slate-700">{card.description}</p>}

      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        {card.base_model && (<><dt className="text-slate-500">Base model</dt><dd className="font-mono">{card.base_model}</dd></>)}
        {card.parameters && (<><dt className="text-slate-500">Parameters</dt><dd>{card.parameters.toLocaleString()}</dd></>)}
        {card.disk_size_bytes && (<><dt className="text-slate-500">Disk</dt><dd>{(card.disk_size_bytes / 1e9).toFixed(1)} GB</dd></>)}
        {card.memory_gb && (<><dt className="text-slate-500">Memory</dt><dd>{card.memory_gb} GB</dd></>)}
        {card.quantization && (<><dt className="text-slate-500">Quantization</dt><dd>{card.quantization}</dd></>)}
        {card.host && (<><dt className="text-slate-500">Host</dt><dd>{card.host}</dd></>)}
        {card.architecture && (<><dt className="text-slate-500">Architecture</dt><dd>{card.architecture}</dd></>)}
        {card.license && (<><dt className="text-slate-500">License</dt><dd>{card.license}</dd></>)}
        {card.kind && (<><dt className="text-slate-500">Kind</dt><dd>{card.kind}</dd></>)}
      </dl>

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

      {provenance.data && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Provenance (EU AI Act §53)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sourced from{' '}
            <a
              className="underline"
              href="https://github.com/ailiance/ailiance/blob/main/docs/provenance/"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/ailiance/ailiance/docs/provenance
            </a>
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-slate-50 p-3 text-xs leading-snug">
            {JSON.stringify(provenance.data, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

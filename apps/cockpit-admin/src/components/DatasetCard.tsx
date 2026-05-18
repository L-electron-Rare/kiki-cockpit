import type { components } from '@cockpit/shared';
import { Link } from '@tanstack/react-router';

type DatasetSummary = components['schemas']['DatasetSummary'];

interface Props {
  dataset: DatasetSummary;
}

export function DatasetCard({ dataset }: Props) {
  const hfUrl = dataset.hf_dataset_id
    ? `https://huggingface.co/datasets/${dataset.hf_dataset_id}`
    : null;
  return (
    <Link
      to="/datasets/$domain"
      params={{ domain: dataset.domain }}
      className="block rounded-lg border border-slate-700 bg-slate-900 p-4 hover:border-violet-500 transition"
    >
      <article>
        <header className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold text-violet-400">{dataset.domain}</h3>
          <span className="text-xs text-slate-400">{dataset.size_mb} MB</span>
        </header>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300">
          <div>
            <dt className="text-slate-500">Rows</dt>
            <dd className="font-mono">{dataset.n_rows.toLocaleString('fr-FR')}</dd>
          </div>
          <div>
            <dt className="text-slate-500">License</dt>
            <dd>{dataset.license}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Source</dt>
            <dd className="truncate">
              {hfUrl ? (
                <a className="text-blue-400" href={hfUrl} target="_blank" rel="noreferrer">
                  {dataset.hf_dataset_id}
                </a>
              ) : (
                <span>{dataset.name}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Downloaded</dt>
            <dd>{dataset.download_date}</dd>
          </div>
        </dl>
        {dataset.notes && <p className="mt-3 text-xs text-slate-400 italic">{dataset.notes}</p>}
      </article>
    </Link>
  );
}

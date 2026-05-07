import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { SampleViewer } from '@/components/SampleViewer';
import { StatsPanel } from '@/components/StatsPanel';
import { useDatasetFlags } from '@/hooks/useDatasetFlags';
import { useDatasetSamples } from '@/hooks/useDatasetSamples';
import { useDatasetStats } from '@/hooks/useDatasetStats';
import { useDatasets } from '@/hooks/useDatasets';

export const Route = createFileRoute('/datasets/$domain')({
  component: DatasetDetailPage,
});

const PAGE_SIZE = 10;

function DatasetDetailPage() {
  const { domain } = Route.useParams();

  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');

  const { data: summaries } = useDatasets();
  const summary = summaries?.find((d) => d.domain === domain);

  const { data: page, isLoading: samplesLoading } = useDatasetSamples({
    domain,
    offset,
    limit: PAGE_SIZE,
    search: search || undefined,
  });

  const { data: stats } = useDatasetStats(domain);

  const { query: flagsQuery, flag, unflag } = useDatasetFlags(domain);
  const flags = flagsQuery.data ?? [];

  function handleSearchChange(newSearch: string) {
    setSearch(newSearch);
    setOffset(0);
  }

  const hfUrl = summary?.hf_dataset_id
    ? `https://huggingface.co/datasets/${summary.hf_dataset_id}`
    : null;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Link
          to="/datasets"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Datasets
        </Link>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-violet-400">{domain}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            {summary && (
              <>
                <span>{summary.n_rows.toLocaleString('fr-FR')} rows</span>
                <span>{summary.license}</span>
                <span>{summary.size_mb} MB</span>
                <span>{summary.download_date}</span>
              </>
            )}
            {hfUrl && (
              <a
                href={hfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:underline"
              >
                HuggingFace
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        {summary?.notes && (
          <p className="text-sm text-slate-400 italic">{summary.notes}</p>
        )}
      </header>

      {stats && <StatsPanel stats={stats} />}

      <SampleViewer
        domain={domain}
        samples={page?.samples ?? []}
        total={page?.total ?? 0}
        offset={offset}
        pageSize={PAGE_SIZE}
        search={search}
        flags={flags}
        onOffsetChange={setOffset}
        onSearchChange={handleSearchChange}
        onFlag={(idx, reason) => flag.mutate({ idx, reason })}
        onUnflag={(idx) => unflag.mutate({ idx })}
        isLoading={samplesLoading}
      />
    </div>
  );
}

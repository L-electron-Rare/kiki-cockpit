import type { components } from '@cockpit/shared';

type Card = components['schemas']['ModelCard'];

interface Props {
  card: Card;
}

export function DatasetList({ card }: Props) {
  // Sprint 1: ModelCard does not yet include datasets. Placeholder for sprint 1+ when ModelDetail is split out.
  return (
    <section className="rounded border border-slate-200 p-4">
      <h3 className="font-bold mb-3">Datasets</h3>
      <p className="text-sm text-slate-500">
        Dataset provenance is available on the model's HuggingFace page:&nbsp;
        <a className="underline" href={card.hf_url} target="_blank" rel="noopener noreferrer">
          {card.hf_url}
        </a>
      </p>
    </section>
  );
}

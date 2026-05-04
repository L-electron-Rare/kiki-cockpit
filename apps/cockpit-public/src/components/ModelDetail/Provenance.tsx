import type { components } from '@cockpit/shared';

type Card = components['schemas']['ModelCard'];

interface Props {
  card: Card;
}

export function Provenance({ card }: Props) {
  return (
    <section className="rounded border border-slate-200 p-4">
      <h3 className="font-bold mb-3">Provenance</h3>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-slate-500">Owner</dt>
        <dd>{card.owner}</dd>
        <dt className="text-slate-500">Base model</dt>
        <dd>{card.base_model ?? '—'}</dd>
        <dt className="text-slate-500">Domain</dt>
        <dd>{card.domain ?? '—'}</dd>
        <dt className="text-slate-500">Last modified</dt>
        <dd>{card.last_modified ? new Date(card.last_modified).toLocaleDateString() : '—'}</dd>
        <dt className="text-slate-500">Downloads</dt>
        <dd>{card.downloads}</dd>
        <dt className="text-slate-500">Likes</dt>
        <dd>{card.likes}</dd>
      </dl>
    </section>
  );
}

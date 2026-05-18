import { seo } from '@/lib/seo';
import { getEvalScores, getMascaradeLoras, getModelDetail, getProvenance } from '@/lib/server-fns';
import { ApiError } from '@cockpit/shared';
import { createFileRoute, notFound } from '@tanstack/react-router';

export const Route = createFileRoute('/models/$owner/$name')({
  // params is annotated explicitly: inferring it from the route context
  // would create a circular type reference that erases the loader's
  // inferred data type (consumed by the .lazy.tsx component).
  head: ({ params }: { params: { owner: string; name: string } }) =>
    seo({
      title: `${params.owner}/${params.name} — Ailiance`,
      description: `Fiche du modèle ${params.owner}/${params.name} : scores d'évaluation audit-grade, provenance et chemin de requête sur la flotte Ailiance.`,
      path: `/models/${params.owner}/${params.name}`,
    }),
  notFoundComponent: () => (
    <main className="wrap" style={{ padding: '64px 0' }}>
      <h1 className="display">Modèle introuvable.</h1>
    </main>
  ),
  loader: async ({ params }) => {
    const model = await getModelDetail({ data: params }).catch((err) => {
      if (err instanceof ApiError && err.status === 404) throw notFound();
      throw err;
    });
    const isMascarade = params.owner === 'ailiance' && params.name === 'mascarade';
    const [evalScores, loras, provenance] = await Promise.all([
      getEvalScores({ data: params }),
      isMascarade ? getMascaradeLoras() : Promise.resolve([]),
      getProvenance({ data: { modelId: `${params.owner}/${params.name}` } }),
    ]);
    return { model, evalScores, loras, provenance };
  },
});

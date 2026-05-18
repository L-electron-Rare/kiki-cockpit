import { seo } from '@/lib/seo';
import { getModelDetail } from '@/lib/server-fns';
import { ApiError } from '@cockpit/shared';
import { createFileRoute, notFound } from '@tanstack/react-router';

export const Route = createFileRoute('/chat/$owner/$name')({
  head: ({ params }) =>
    seo({
      title: `Chat ${params.owner}/${params.name} — Ailiance`,
      description: `Playground du modèle ${params.owner}/${params.name} sur la flotte LLM souveraine Ailiance — sans inscription ni clé d'API.`,
      path: `/chat/${params.owner}/${params.name}`,
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
    return { model };
  },
});

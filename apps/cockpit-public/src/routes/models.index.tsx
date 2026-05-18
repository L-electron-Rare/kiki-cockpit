import { seo } from '@/lib/seo';
import { getModels, getStatus } from '@/lib/server-fns';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/models/')({
  head: () =>
    seo({
      title: 'Modèles servis en direct — Ailiance',
      description:
        'Tous les modèles servis par la flotte LLM Ailiance : playground intégré, statut live et chemin de requête.',
      path: '/models',
    }),
  loader: async () => {
    const [modelsResult, statusResult] = await Promise.allSettled([getModels(), getStatus()]);
    if (modelsResult.status === 'rejected') throw modelsResult.reason;
    return {
      models: modelsResult.value,
      status: statusResult.status === 'fulfilled' ? statusResult.value : null,
    };
  },
});

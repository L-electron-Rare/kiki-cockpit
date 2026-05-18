import { seo } from '@/lib/seo';
import { getStatus } from '@/lib/server-fns';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/status')({
  head: () =>
    seo({
      title: 'Statut de la flotte — Ailiance',
      description:
        'État en direct des workers LLM, latences et disponibilité de la gateway souveraine Ailiance.',
      path: '/status',
    }),
  loader: async () => {
    const [statusResult] = await Promise.allSettled([getStatus()]);
    return {
      status: statusResult.status === 'fulfilled' ? statusResult.value : null,
    };
  },
});

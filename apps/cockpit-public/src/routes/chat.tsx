import { seo } from '@/lib/seo';
import { getModels } from '@/lib/server-fns';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/chat')({
  head: () =>
    seo({
      title: 'Playground — Ailiance',
      description:
        "Testez la flotte LLM souveraine Ailiance sans inscription ni clé d'API — 30 requêtes par minute par IP.",
      path: '/chat',
    }),
  loader: async () => {
    try {
      return { models: await getModels() };
    } catch {
      return { models: [] };
    }
  },
});

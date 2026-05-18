import { seo } from '@/lib/seo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  head: () =>
    seo({
      title: 'À propos — Ailiance',
      description:
        'La flotte LLM Ailiance est fine-tunée sur Apple Silicon avec MLX ; adaptateurs de raisonnement traçables publiés sous Apache-2.0.',
      path: '/about',
    }),
});

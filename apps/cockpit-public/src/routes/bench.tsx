import { seo } from '@/lib/seo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/bench')({
  head: () =>
    seo({
      title: 'Bench kicad-sch — Ailiance',
      description:
        "Résultats du sweep d'évaluation kicad-sch : comparaison audit-grade des modèles de la flotte LLM Ailiance.",
      path: '/bench',
    }),
});

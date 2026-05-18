import { seo } from '@/lib/seo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/transparency')({
  head: () =>
    seo({
      title: 'Démarche Qualité IA Act — Ailiance',
      description:
        "Conformité au règlement (UE) 2024/1689 : documentation technique, résumé des données, procédure de validation, vérification des biais et mécanisme d'incidents.",
      path: '/transparency',
    }),
});

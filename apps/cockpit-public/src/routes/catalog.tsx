import { seo } from '@/lib/seo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/catalog')({
  head: () =>
    seo({
      title: 'Catalogue HuggingFace — Ailiance',
      description:
        'Dépôts de modèles, adaptateurs LoRA et datasets publiés sur HuggingFace par Ailiance, sous licences ouvertes.',
      path: '/catalog',
    }),
});

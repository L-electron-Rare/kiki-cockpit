import { getModelDetail } from '@/lib/server-fns';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/chat/$owner/$name')({
  loader: async ({ params }) => ({
    model: await getModelDetail({ data: params }),
  }),
});

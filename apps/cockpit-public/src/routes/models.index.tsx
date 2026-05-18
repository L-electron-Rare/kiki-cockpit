import { getModels, getStatus } from '@/lib/server-fns';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/models/')({
  loader: async () => ({
    models: await getModels(),
    status: await getStatus(),
  }),
});

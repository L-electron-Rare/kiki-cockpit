import { getModels } from '@/lib/server-fns';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/chat')({
  loader: async () => ({ models: await getModels() }),
});

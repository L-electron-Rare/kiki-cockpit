import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/training/$id')({
  component: TrainingDetailPage,
});

function TrainingDetailPage() {
  return <p>Training detail page</p>;
}

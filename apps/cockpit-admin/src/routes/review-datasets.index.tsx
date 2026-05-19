import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/review-datasets/')({
  component: ReviewDatasetsPage,
});

export function ReviewDatasetsPage() {
  const gristUrl = import.meta.env.VITE_GRIST_URL;

  if (!gristUrl) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Grist review URL not configured. Set <code>VITE_GRIST_URL</code> at build time once the
        Grist review doc is published.
      </div>
    );
  }

  return (
    <iframe
      title="Grist dataset review"
      src={gristUrl}
      className="h-[calc(100vh-6rem)] w-full border-0"
    />
  );
}

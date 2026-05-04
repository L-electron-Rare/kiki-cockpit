/**
 * Format a download count with thousand separators (1234 → "1,234").
 */
export function formatDownloads(count: number): string {
  return new Intl.NumberFormat('en-US').format(count);
}

/**
 * Parse a HuggingFace model ID "owner/name" into its parts.
 * Returns null if the format is invalid.
 */
export function parseModelId(id: string): { owner: string; name: string } | null {
  const parts = id.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], name: parts[1] };
}

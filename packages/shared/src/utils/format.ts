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

/**
 * Compact byte size — "1.2 GB", "456 MB". Uses 1000-based units to match the
 * sizes HF reports.
 */
export function formatBytes(bytes: number | null | undefined): string | null {
  if (bytes == null || bytes <= 0) return null;
  const units = ['B', 'kB', 'MB', 'GB', 'TB'];
  let n = bytes;
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i += 1;
  }
  const decimals = i >= 3 ? 1 : 0;
  return `${n.toFixed(decimals)} ${units[i]}`;
}

/**
 * Compact parameter count — 22_700_000 → "22.7M", 70_000_000_000 → "70B".
 */
export function formatParams(params: number | null | undefined): string | null {
  if (params == null || params <= 0) return null;
  if (params >= 1e9) return `${(params / 1e9).toFixed(params >= 1e10 ? 0 : 1)}B`;
  if (params >= 1e6) return `${(params / 1e6).toFixed(params >= 1e7 ? 0 : 1)}M`;
  if (params >= 1e3) return `${(params / 1e3).toFixed(0)}k`;
  return `${params}`;
}

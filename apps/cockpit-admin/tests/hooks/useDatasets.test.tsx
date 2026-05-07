import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useDatasets } from '../../src/hooks/useDatasets';

const mockFetch = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => mockFetch(...args) },
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useDatasets', () => {
  beforeEach(() => mockFetch.mockReset());

  it('fetches /api/admin/datasets and exposes data', async () => {
    mockFetch.mockResolvedValueOnce([
      { domain: 'electronics-hw', name: 'oshwa', n_rows: 4321, license: 'CERN-OHL-S-2.0', size_mb: 14, hf_dataset_id: 'x/y', download_date: '2026-04-26' },
    ]);
    const { result } = renderHook(() => useDatasets(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.domain).toBe('electronics-hw');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/datasets',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });
});

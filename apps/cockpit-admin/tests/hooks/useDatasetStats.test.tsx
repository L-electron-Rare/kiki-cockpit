import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDatasetStats } from '../../src/hooks/useDatasetStats';

const mockFetch = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => mockFetch(...args) },
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const fakeStats = {
  domain: 'python',
  total: 1000,
  user_len_avg: 120.5,
  assistant_len_avg: 350.2,
  user_len_p50: 100,
  user_len_p95: 250,
  assistant_len_p50: 300,
  assistant_len_p95: 900,
  duplicate_user_count: 5,
  length_buckets: [
    { bucket: '<200', count: 50 },
    { bucket: '200-500', count: 300 },
  ],
};

describe('useDatasetStats', () => {
  beforeEach(() => mockFetch.mockReset());

  it('fetches stats for a domain', async () => {
    mockFetch.mockResolvedValueOnce(fakeStats);
    const { result } = renderHook(() => useDatasetStats('python'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(1000);
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/datasets/python/stats', expect.anything());
  });

  it('exposes length_buckets', async () => {
    mockFetch.mockResolvedValueOnce(fakeStats);
    const { result } = renderHook(() => useDatasetStats('python'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length_buckets).toHaveLength(2);
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDatasetSamples } from '../../src/hooks/useDatasetSamples';

const mockFetch = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => mockFetch(...args) },
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const fakePage = {
  samples: [{ user: 'hello', assistant: 'world' }],
  total: 25,
  offset: 0,
  has_more: true,
};

describe('useDatasetSamples', () => {
  beforeEach(() => mockFetch.mockReset());

  it('fetches samples with default params', async () => {
    mockFetch.mockResolvedValueOnce(fakePage);
    const { result } = renderHook(() => useDatasetSamples({ domain: 'python' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(25);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/datasets/python/samples'),
      expect.anything(),
    );
  });

  it('includes offset, limit, search in URL', async () => {
    mockFetch.mockResolvedValueOnce({ ...fakePage, offset: 10 });
    const { result } = renderHook(
      () => useDatasetSamples({ domain: 'python', offset: 10, limit: 5, search: 'foo' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url: string = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain('offset=10');
    expect(url).toContain('limit=5');
    expect(url).toContain('search=foo');
  });

  it('exposes error on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useDatasetSamples({ domain: 'python' }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

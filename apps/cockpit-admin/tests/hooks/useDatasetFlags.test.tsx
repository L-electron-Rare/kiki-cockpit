import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDatasetFlags } from '../../src/hooks/useDatasetFlags';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const fakeFlags = [
  { idx: 3, reason: 'bad', flagged_at: '2026-01-01T00:00:00Z', flagged_by: 'user@x.com' },
];

describe('useDatasetFlags', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockDelete.mockReset();
  });

  it('lists flags for domain', async () => {
    mockGet.mockResolvedValueOnce(fakeFlags);
    const { result } = renderHook(() => useDatasetFlags('python'), { wrapper });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledWith('/api/admin/datasets/python/flags', expect.anything());
  });

  it('flag mutation calls POST', async () => {
    mockGet.mockResolvedValue([]);
    mockPost.mockResolvedValueOnce({
      idx: 5,
      reason: 'dup',
      flagged_at: '2026-01-01T00:00:00Z',
      flagged_by: null,
    });
    const { result } = renderHook(() => useDatasetFlags('python'), { wrapper });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    await act(async () => {
      await result.current.flag.mutateAsync({ idx: 5, reason: 'dup' });
    });
    expect(mockPost).toHaveBeenCalledWith('/api/admin/datasets/python/flags', {
      idx: 5,
      reason: 'dup',
    });
  });

  it('unflag mutation calls DELETE', async () => {
    mockGet.mockResolvedValue([]);
    mockDelete.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useDatasetFlags('python'), { wrapper });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    await act(async () => {
      await result.current.unflag.mutateAsync({ idx: 3 });
    });
    expect(mockDelete).toHaveBeenCalledWith('/api/admin/datasets/python/flags/3');
  });
});

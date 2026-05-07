import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useLaunchTraining } from '../../src/hooks/useLaunchTraining';

const mockPost = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useLaunchTraining', () => {
  beforeEach(() => mockPost.mockReset());

  it('posts /api/admin/training/launch with the request body', async () => {
    mockPost.mockResolvedValueOnce({ run_id: 'electronics-hw-123', host: 'macm1' });
    const { result } = renderHook(() => useLaunchTraining(), { wrapper });

    await act(async () => {
      result.current.mutate({
        base_model: 'ailiance/gemma4-e4b-curriculum',
        dataset_domain: 'electronics-hw',
        iters: 500,
        lora_rank: 32,
        learning_rate: 5e-6,
        max_seq_length: 3072,
        batch_size: 1,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      '/api/admin/training/launch',
      expect.objectContaining({ base_model: 'ailiance/gemma4-e4b-curriculum' }),
    );
    expect(result.current.data?.host).toBe('macm1');
  });
});

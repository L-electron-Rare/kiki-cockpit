import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TrainingDesigner } from '../../src/components/TrainingDesigner';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const wrap = (node: ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
};

describe('TrainingDesigner', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockGet.mockResolvedValue([
      {
        domain: 'electronics-hw',
        name: 'oshwa',
        n_rows: 4321,
        license: 'MIT',
        hf_dataset_id: 'a/b',
        download_date: '2026-04-26',
        size_bytes: 1,
        size_mb: 0.1,
      },
    ]);
  });

  it('renders base model and dataset selects', async () => {
    render(wrap(<TrainingDesigner onClose={() => {}} />));
    expect(await screen.findByLabelText(/base model/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/dataset/i)).toBeInTheDocument();
  });

  it('posts the request when Launch is clicked', async () => {
    mockPost.mockResolvedValue({ run_id: 'electronics-hw-1', host: 'macm1' });
    const onLaunched = vi.fn();
    render(wrap(<TrainingDesigner onClose={() => {}} onLaunched={onLaunched} />));

    fireEvent.change(await screen.findByLabelText(/dataset/i), {
      target: { value: 'electronics-hw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /launch/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(mockPost.mock.calls[0]?.[0]).toBe('/api/admin/training/launch');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect((mockPost.mock.calls[0]?.[1] as { dataset_domain: string }).dataset_domain).toBe(
      'electronics-hw',
    );
    await waitFor(() => expect(onLaunched).toHaveBeenCalledWith('electronics-hw-1'));
  });
});

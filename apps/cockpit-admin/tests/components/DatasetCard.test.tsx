import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createRouter, createMemoryHistory, createRootRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { DatasetCard } from '../../src/components/DatasetCard';

const sample = {
  domain: 'electronics-hw',
  name: 'oshwa',
  n_rows: 4321,
  license: 'CERN-OHL-S-2.0',
  hf_dataset_id: 'electron-rare/oshwa',
  download_date: '2026-04-26',
  size_bytes: 14_222_345,
  size_mb: 13.56,
  notes: null,
};

async function renderWithRouter(ui: ReactNode) {
  const rootRoute = createRootRoute({ component: () => <>{ui}</> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(<RouterProvider router={router} />);
  // Wait for router to resolve and render
  await screen.findByText('electronics-hw');
}

describe('DatasetCard', () => {
  it('renders the domain, row count, and license', async () => {
    await renderWithRouter(<DatasetCard dataset={sample} />);
    expect(screen.getByText('electronics-hw')).toBeInTheDocument();
    expect(screen.getByText(/4 ?321/)).toBeInTheDocument();
    expect(screen.getByText('CERN-OHL-S-2.0')).toBeInTheDocument();
  });

  it('renders HF dataset id text', async () => {
    await renderWithRouter(<DatasetCard dataset={sample} />);
    expect(screen.getByText('electron-rare/oshwa')).toBeInTheDocument();
  });
});

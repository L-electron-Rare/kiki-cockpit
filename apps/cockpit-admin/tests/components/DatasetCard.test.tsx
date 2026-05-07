import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

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

describe('DatasetCard', () => {
  it('renders the domain, row count, and license', () => {
    render(<DatasetCard dataset={sample} />);
    expect(screen.getByText('electronics-hw')).toBeInTheDocument();
    expect(screen.getByText(/4 ?321/)).toBeInTheDocument();
    expect(screen.getByText('CERN-OHL-S-2.0')).toBeInTheDocument();
  });

  it('renders the HF dataset link', () => {
    render(<DatasetCard dataset={sample} />);
    const link = screen.getByRole('link', { name: /electron-rare\/oshwa/ });
    expect(link).toHaveAttribute('href', 'https://huggingface.co/datasets/electron-rare/oshwa');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatsPanel } from '../../src/components/StatsPanel';

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
    { bucket: '500-1000', count: 400 },
    { bucket: '1000-2000', count: 200 },
    { bucket: '>=2000', count: 50 },
  ],
};

describe('StatsPanel', () => {
  it('renders total samples', () => {
    render(<StatsPanel stats={fakeStats} />);
    // 1000 formatted as fr-FR = "1 000"
    expect(screen.getByText(/1[\s ]?000/)).toBeInTheDocument();
  });

  it('renders duplicate user count', () => {
    render(<StatsPanel stats={fakeStats} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders the chart section', () => {
    render(<StatsPanel stats={fakeStats} />);
    expect(screen.getByText(/Assistant length distribution/i)).toBeInTheDocument();
  });

  it('does not render chart when no buckets', () => {
    render(<StatsPanel stats={{ ...fakeStats, length_buckets: [] }} />);
    expect(screen.queryByText(/Assistant length distribution/i)).not.toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { BenchmarkTable } from '../../src/components/BenchmarkTable';

const baseRun = {
  run_id: 'devstral-base-humanevalplus',
  benchmark: 'HumanEval+',
  model: 'ailiance/devstral-24b',
  adapter: '(base)',
  score: 82.9,
  score_unit: '%',
  delta_vs_base: 0,
  n_samples: 164,
  date: '2026-05-04',
  host: 'kx6tm-23 Linux',
  verdict: 'reference',
  notes: 'HE base 87.20% / HE+ 82.90%',
};

const adapterRun = {
  ...baseRun,
  run_id: 'devstral-python-fused-humanevalplus',
  adapter: 'python',
  score: 81.1,
  delta_vs_base: -1.8,
  verdict: 'loss',
  notes: 'HE base 86.00% / HE+ 81.10%',
};

describe('BenchmarkTable', () => {
  it('renders benchmark name and run count', () => {
    render(<BenchmarkTable benchmark="HumanEval+" runs={[baseRun, adapterRun]} />);
    expect(screen.getByText('HumanEval+')).toBeInTheDocument();
    expect(screen.getByText('2 runs')).toBeInTheDocument();
  });

  it('renders adapter names in rows', () => {
    render(<BenchmarkTable benchmark="HumanEval+" runs={[baseRun, adapterRun]} />);
    expect(screen.getByText('(base)')).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('renders score with unit', () => {
    render(<BenchmarkTable benchmark="HumanEval+" runs={[baseRun]} />);
    expect(screen.getByText('82.9%')).toBeInTheDocument();
  });

  it('renders positive delta in green', () => {
    const winRun = { ...baseRun, run_id: 'win', delta_vs_base: 5.0 };
    render(<BenchmarkTable benchmark="HumanEval+" runs={[winRun]} />);
    const delta = screen.getByText('+5');
    expect(delta.className).toContain('emerald');
  });

  it('renders negative delta in red', () => {
    render(<BenchmarkTable benchmark="HumanEval+" runs={[adapterRun]} />);
    const delta = screen.getByText('-1.8');
    expect(delta.className).toContain('red');
  });

  it('renders verdict badge', () => {
    render(<BenchmarkTable benchmark="HumanEval+" runs={[baseRun]} />);
    expect(screen.getByText('reference')).toBeInTheDocument();
  });

  it('renders notes', () => {
    render(<BenchmarkTable benchmark="HumanEval+" runs={[baseRun]} />);
    expect(screen.getByText('HE base 87.20% / HE+ 82.90%')).toBeInTheDocument();
  });
});

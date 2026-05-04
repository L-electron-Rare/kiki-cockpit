import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LossChart } from '../../src/components/LossChart';

describe('LossChart', () => {
  it('renders empty state when no metrics', () => {
    render(<LossChart metrics={[]} />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('renders chart container when metrics provided', () => {
    const metrics = [
      { iter: 100, split: 'train', loss: 0.5, lr: null, took_s: null },
      { iter: 100, split: 'val', loss: 0.45, lr: null, took_s: 10 },
      { iter: 200, split: 'train', loss: 0.4, lr: null, took_s: null },
    ];
    const { container } = render(<LossChart metrics={metrics} />);
    expect(container.querySelector('.recharts-wrapper')).toBeTruthy();
  });
});

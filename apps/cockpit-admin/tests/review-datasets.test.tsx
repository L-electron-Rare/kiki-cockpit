import { render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ReviewDatasetsPage } from '../src/routes/review-datasets.index';

afterEach(() => {
  vi.unstubAllEnvs();
});

test('renders the Grist iframe when VITE_GRIST_URL is set', () => {
  vi.stubEnv('VITE_GRIST_URL', 'https://grist.saillant.cc/o/docs/abc');
  render(<ReviewDatasetsPage />);
  const frame = screen.getByTitle('Grist dataset review');
  expect(frame.tagName).toBe('IFRAME');
  expect(frame).toHaveAttribute('src', 'https://grist.saillant.cc/o/docs/abc');
});

test('shows a fallback message when VITE_GRIST_URL is unset', () => {
  vi.stubEnv('VITE_GRIST_URL', '');
  render(<ReviewDatasetsPage />);
  expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  expect(screen.queryByTitle('Grist dataset review')).toBeNull();
});

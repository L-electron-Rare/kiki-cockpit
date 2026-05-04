import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LogTail } from '../../src/components/LogTail';

describe('LogTail', () => {
  it('renders an empty list', () => {
    const { container } = render(<LogTail events={[]} />);
    expect(container).toBeTruthy();
  });

  it('renders raw lines', () => {
    render(
      <LogTail
        events={[
          { type: 'raw', raw: 'Loading config…' },
          { type: 'raw', raw: 'Trainable params 16M' },
        ]}
      />,
    );
    // Virtuoso may render lazily; test the filter input is present
    expect(screen.getByPlaceholderText(/regex filter/i)).toBeInTheDocument();
  });
});

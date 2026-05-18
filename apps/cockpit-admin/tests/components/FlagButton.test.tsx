import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FlagButton } from '../../src/components/FlagButton';

const emptyFlags: never[] = [];

describe('FlagButton', () => {
  it('renders Flag label when not flagged', () => {
    render(<FlagButton idx={0} flags={emptyFlags} onFlag={vi.fn()} onUnflag={vi.fn()} />);
    expect(screen.getByText('Flag')).toBeInTheDocument();
  });

  it('renders Flagged label when flagged', () => {
    const flags = [{ idx: 0, reason: 'bad', flagged_at: '2026-01-01T00:00:00Z', flagged_by: null }];
    render(<FlagButton idx={0} flags={flags} onFlag={vi.fn()} onUnflag={vi.fn()} />);
    expect(screen.getByText('Flagged')).toBeInTheDocument();
  });

  it('calls onFlag with idx and reason on prompt', () => {
    const onFlag = vi.fn();
    vi.spyOn(window, 'prompt').mockReturnValueOnce('duplicate');
    render(<FlagButton idx={3} flags={emptyFlags} onFlag={onFlag} onUnflag={vi.fn()} />);
    fireEvent.click(screen.getByText('Flag'));
    expect(onFlag).toHaveBeenCalledWith(3, 'duplicate');
  });

  it('calls onUnflag when already flagged', () => {
    const onUnflag = vi.fn();
    const flags = [{ idx: 5, reason: 'x', flagged_at: '2026-01-01T00:00:00Z', flagged_by: null }];
    render(<FlagButton idx={5} flags={flags} onFlag={vi.fn()} onUnflag={onUnflag} />);
    fireEvent.click(screen.getByText('Flagged'));
    expect(onUnflag).toHaveBeenCalledWith(5);
  });

  it('does not call onFlag if prompt is cancelled', () => {
    const onFlag = vi.fn();
    vi.spyOn(window, 'prompt').mockReturnValueOnce(null);
    render(<FlagButton idx={0} flags={emptyFlags} onFlag={onFlag} onUnflag={vi.fn()} />);
    fireEvent.click(screen.getByText('Flag'));
    expect(onFlag).not.toHaveBeenCalled();
  });
});

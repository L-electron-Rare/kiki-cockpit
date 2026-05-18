import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SampleViewer } from '../../src/components/SampleViewer';

const samples = [
  { user: 'Hello?', assistant: 'Hi there!' },
  { user: 'What is 2+2?', assistant: '4' },
];

const baseProps = {
  domain: 'python',
  samples,
  total: 25,
  offset: 0,
  pageSize: 10,
  search: '',
  flags: [],
  onOffsetChange: vi.fn(),
  onSearchChange: vi.fn(),
  onFlag: vi.fn(),
  onUnflag: vi.fn(),
};

describe('SampleViewer', () => {
  it('renders sample messages', () => {
    render(<SampleViewer {...baseProps} />);
    expect(screen.getByText('Hello?')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('renders sample indices', () => {
    render(<SampleViewer {...baseProps} />);
    expect(screen.getByText('#0')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('shows pagination info', () => {
    render(<SampleViewer {...baseProps} />);
    expect(screen.getByText(/1–10 of/)).toBeInTheDocument();
  });

  it('Prev button is disabled at offset 0', () => {
    render(<SampleViewer {...baseProps} />);
    const prev = screen.getByText('Prev').closest('button')!;
    expect(prev).toBeDisabled();
  });

  it('Next button enabled when has_more', () => {
    render(<SampleViewer {...baseProps} total={25} />);
    const next = screen.getByText('Next').closest('button')!;
    expect(next).not.toBeDisabled();
  });

  it('clicking Next calls onOffsetChange', () => {
    const onOffsetChange = vi.fn();
    render(<SampleViewer {...baseProps} onOffsetChange={onOffsetChange} />);
    fireEvent.click(screen.getByText('Next').closest('button')!);
    expect(onOffsetChange).toHaveBeenCalledWith(10);
  });

  it('shows loading state', () => {
    render(<SampleViewer {...baseProps} samples={[]} total={0} isLoading={true} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<SampleViewer {...baseProps} samples={[]} total={0} />);
    expect(screen.getByText('No samples found.')).toBeInTheDocument();
  });

  it('search form submission calls onSearchChange', () => {
    const onSearchChange = vi.fn();
    render(<SampleViewer {...baseProps} onSearchChange={onSearchChange} />);
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.submit(input.closest('form')!);
    expect(onSearchChange).toHaveBeenCalledWith('hello');
  });
});

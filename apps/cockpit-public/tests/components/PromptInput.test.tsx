import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PromptInput } from '../../src/components/ChatPlayground/PromptInput';

const ORIG_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIG_FETCH;
  vi.restoreAllMocks();
});

// PromptInput is a controlled component; this harness owns the input
// state the way ChatPlayground does in production.
function Harness({ onSubmit }: { onSubmit?: (text: string) => void }) {
  const [value, setValue] = useState('');
  return <PromptInput value={value} onChange={setValue} onSubmit={onSubmit ?? (() => {})} />;
}

describe('PromptInput', () => {
  it('submits plain text on Enter', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText(/Type a message/i);
    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('hello');
  });

  it("doesn't submit on Shift+Enter (newline)", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText(/Type a message/i);
    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables send when no text and no attachment', () => {
    render(<Harness />);
    // The Send button has no accessible name (icon only); pick last button.
    const buttons = screen.getAllByRole('button');
    const send = buttons[buttons.length - 1];
    expect(send).toBeDisabled();
  });

  it('uploads a file and shows the attachment pill', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        markdown: '# Title\n\nbody',
        format: 'docx',
        filename: 'report.docx',
        metadata: { paragraphs: 2 },
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake docx bytes'], 'report.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = fetchMock.mock.calls[0]?.[0] as string | undefined;
    expect(url?.endsWith('/v1/files/extract')).toBe(true);
    expect(await screen.findByText('report.docx')).toBeInTheDocument();
    expect(screen.getByText('docx')).toBeInTheDocument();
  });

  it('composes a payload combining attachment markdown and user text', async () => {
    const onSubmit = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        markdown: 'EXTRACTED',
        format: 'pdf',
        filename: 'q1.pdf',
        metadata: {},
      }),
    }) as unknown as typeof fetch;

    render(<Harness onSubmit={onSubmit} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'q1.pdf', { type: 'application/pdf' })] },
    });
    await screen.findByText('q1.pdf');
    fireEvent.change(screen.getByPlaceholderText(/Ask a question/i), {
      target: { value: 'summarize please' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText(/Ask a question/i), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalled();
    const payload = onSubmit.mock.calls[0]?.[0] as string | undefined;
    if (!payload) throw new Error('onSubmit was not called with a payload');
    expect(payload).toContain('Attached file: q1.pdf');
    expect(payload).toContain('EXTRACTED');
    expect(payload).toContain('summarize please');
  });

  it('surfaces a backend error message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: { code: 'file_too_large', message: 'too big' } }),
    }) as unknown as typeof fetch;

    render(<Harness />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'big.pdf', { type: 'application/pdf' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/too big/i);
  });
});

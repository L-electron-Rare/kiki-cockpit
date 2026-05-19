import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatPlayground } from '../../src/components/ChatPlayground/ChatPlayground';

// The hook actually issues fetch() calls; we only care about the param
// defaults in this test, not the wire protocol.
vi.mock('@/hooks/useChatStream', () => ({
  useChatStream: () => ({
    assistantText: '',
    isStreaming: false,
    error: null,
    send: vi.fn(),
    stop: vi.fn(),
  }),
}));

function readMaxTokensInput(): HTMLInputElement {
  // ParamsPanel is collapsed by default — open it first.
  const toggle = screen.getByRole('button', { name: /paramètres/i });
  fireEvent.click(toggle);
  // The only number input in ParamsPanel is max_tokens (temperature is a
  // range, system_prompt is a textarea).
  const input = document.querySelector('input[type="number"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('max_tokens input not found in ParamsPanel after opening');
  }
  return input;
}

describe('ChatPlayground default max_tokens', () => {
  it('defaults to 1024 for a non-reasoning alias', () => {
    render(<ChatPlayground modelId="ailiance-qwen" modelDisplayName="Qwen" />);
    expect(readMaxTokensInput().value).toBe('1024');
  });

  it('defaults to 2048 for ailiance-gemma2 (MLX reasoning)', () => {
    render(<ChatPlayground modelId="ailiance-gemma2" modelDisplayName="Gemma" />);
    expect(readMaxTokensInput().value).toBe('2048');
  });

  it('defaults to 2048 for ailiance-reasoning-r1 (DeepSeek R1)', () => {
    render(<ChatPlayground modelId="ailiance-reasoning-r1" modelDisplayName="R1" />);
    expect(readMaxTokensInput().value).toBe('2048');
  });

  it('defaults to 2048 for ailiance-ministral-reasoning', () => {
    render(<ChatPlayground modelId="ailiance-ministral-reasoning" modelDisplayName="Ministral" />);
    expect(readMaxTokensInput().value).toBe('2048');
  });

  it('defaults to 1024 for the auto-router alias', () => {
    render(<ChatPlayground modelId="ailiance" modelDisplayName="Auto" />);
    expect(readMaxTokensInput().value).toBe('1024');
  });
});

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useChatStream } from '../../src/hooks/useChatStream';

function mockFetchSSE(events: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const ev of events) controller.enqueue(encoder.encode(ev));
      controller.close();
    },
  });
  return vi
    .fn()
    .mockResolvedValue(
      new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    );
}

describe('useChatStream', () => {
  it('streams tokens and accumulates assistant text', async () => {
    globalThis.fetch = mockFetchSSE([
      'event: token\ndata: {"text":"Hel"}\n\n',
      'event: token\ndata: {"text":"lo"}\n\n',
      'event: done\ndata: {}\n\n',
    ]) as unknown as typeof fetch;

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send('ailiance/apertus-70b', [{ role: 'user', content: 'hi' }]);
    });

    expect(result.current.assistantText).toBe('Hello');
    expect(result.current.isStreaming).toBe(false);
  });
});

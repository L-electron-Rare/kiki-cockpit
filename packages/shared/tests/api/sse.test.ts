import { describe, expect, it } from 'vitest';
import { parseSSEStream } from '../../src/api/sse';

describe('parseSSEStream', () => {
  it('parses concatenated SSE events from a ReadableStream', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: token\ndata: {"text":"Hello"}\n\n'));
        controller.enqueue(encoder.encode('event: token\ndata: {"text":" world"}\n\n'));
        controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
        controller.close();
      },
    });

    const events: { event: string; data: string }[] = [];
    for await (const ev of parseSSEStream(stream)) {
      events.push({ event: ev.event ?? '', data: ev.data });
    }

    expect(events).toEqual([
      { event: 'token', data: '{"text":"Hello"}' },
      { event: 'token', data: '{"text":" world"}' },
      { event: 'done', data: '{}' },
    ]);
  });

  it('handles abort gracefully', async () => {
    const stream = new ReadableStream<Uint8Array>({ start() {} });
    const ac = new AbortController();
    const iter = parseSSEStream(stream, ac.signal);
    ac.abort();
    const result = await iter.next();
    expect(result.done).toBe(true);
  });
});

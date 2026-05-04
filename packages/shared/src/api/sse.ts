/**
 * Async-iterable parser for text/event-stream over a fetch ReadableStream.
 * Uses eventsource-parser for spec-compliant SSE chunk handling.
 */
import { createParser, type EventSourceMessage } from 'eventsource-parser';

export interface SSEEvent {
  event: string | undefined;
  data: string;
  id: string | undefined;
}

export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent, void, unknown> {
  const queue: SSEEvent[] = [];
  let closed = false;
  let resolveNext: (() => void) | null = null;

  const parser = createParser({
    onEvent: (msg: EventSourceMessage) => {
      queue.push({ event: msg.event, data: msg.data, id: msg.id });
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    },
  });

  const reader = stream.getReader();
  const decoder = new TextDecoder();

  const pump = (async () => {
    try {
      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } finally {
      closed = true;
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    }
  })();

  try {
    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!;
        continue;
      }
      if (closed) break;
      if (signal?.aborted) break;
      await new Promise<void>((resolve) => {
        resolveNext = resolve;
      });
    }
  } finally {
    reader.cancel().catch(() => {});
    await pump.catch(() => {});
  }
}

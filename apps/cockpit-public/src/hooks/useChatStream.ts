import { parseSSEStream } from '@cockpit/shared';
import { useCallback, useRef, useState } from 'react';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function useChatStream() {
  const [assistantText, setAssistantText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (
      modelId: string,
      messages: ChatMessage[],
      params?: { temperature?: number; max_tokens?: number; system_prompt?: string },
    ) => {
      setAssistantText('');
      setError(null);
      setIsStreaming(true);
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const response = await fetch('/api/public/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_id: modelId,
            messages,
            temperature: params?.temperature ?? 0.7,
            max_tokens: params?.max_tokens ?? 1024,
            system_prompt: params?.system_prompt,
          }),
          signal: ac.signal,
        });
        if (!response.ok || !response.body) {
          setError(`HTTP ${response.status}`);
          setIsStreaming(false);
          return;
        }
        for await (const ev of parseSSEStream(response.body, ac.signal)) {
          if (ev.event === 'token') {
            try {
              const parsed = JSON.parse(ev.data) as { text?: string };
              if (parsed.text) setAssistantText((cur) => cur + parsed.text);
            } catch {}
          }
          if (ev.event === 'done') break;
          if (ev.event === 'error') {
            setError(ev.data);
            break;
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { assistantText, isStreaming, error, send, stop };
}

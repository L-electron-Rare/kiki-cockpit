import { useState } from 'react';
import { Square } from 'lucide-react';
import { useChatStream, type ChatMessage } from '@/hooks/useChatStream';
import { MessageBubble } from './MessageBubble';
import { PromptInput } from './PromptInput';
import { ParamsPanel, type ChatParams } from './ParamsPanel';

interface Props {
  modelId: string;
  modelDisplayName: string;
}

export function ChatPlayground({ modelId, modelDisplayName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [params, setParams] = useState<ChatParams>({
    temperature: 0.7,
    max_tokens: 1024,
    system_prompt: '',
  });
  const { assistantText, isStreaming, error, send, stop } = useChatStream();

  const handleSubmit = async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    await send(modelId, next, params);
    setMessages([...next, { role: 'assistant', content: assistantText || '' }]);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[80vh] gap-4">
      <header>
        <h2 className="font-bold text-xl">Chat — {modelDisplayName}</h2>
        <p className="text-xs text-slate-500">{modelId}</p>
      </header>

      <ParamsPanel value={params} onChange={setParams} />

      <div className="flex-1 overflow-y-auto rounded border border-slate-200 p-4 space-y-3">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role as 'user' | 'assistant'} content={m.content} />
        ))}
        {isStreaming && <MessageBubble role="assistant" content={assistantText} streaming />}
        {error && <p className="text-rose-700 text-sm">Error: {error}</p>}
      </div>

      <PromptInput onSubmit={handleSubmit} disabled={isStreaming} />
      {isStreaming && (
        <button
          type="button"
          onClick={stop}
          className="self-end rounded border border-rose-500 px-3 py-1 text-sm text-rose-700"
        >
          <Square size={12} className="inline mr-1" /> Stop
        </button>
      )}
    </div>
  );
}

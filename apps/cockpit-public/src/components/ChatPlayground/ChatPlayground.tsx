import { type ChatMessage, useChatStream } from '@/hooks/useChatStream';
import { Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { type ChatParams, ParamsPanel } from './ParamsPanel';
import { PromptInput } from './PromptInput';

interface Props {
  modelId: string;
  modelDisplayName: string;
}

// Aliases whose worker spends a large fraction of its token budget on a
// hidden chain-of-thought before producing the user-facing answer.
// Defaulting these to 1024 max_tokens (the generic default) truncates the
// thinking phase and the user sees a reply that ends mid-reasoning. Bump
// to 2048 so the model has room to finish the thought *and* answer.
//
// Worker-side payloads remain capped by their own context window; this is
// only a Playground UX default. Power users can override via ParamsPanel.
const REASONING_ALIASES = new Set([
  'ailiance-gemma2',
  'ailiance-reasoning-r1',
  'ailiance-ministral-reasoning',
  'ailiance-apertus-math-reasoning',
]);

const DEFAULT_MAX_TOKENS = 1024;
const REASONING_MAX_TOKENS = 2048;

// Seed prompts shown on the empty playground — clicking one fills the
// input (without sending) so the user can edit before submitting.
const EXAMPLE_PROMPTS = [
  "Explique le rôle d'un régulateur LDO dans une alimentation embarquée.",
  'Écris une fonction Python qui parse un fichier de log et renvoie les erreurs.',
  'Compare MQTT et HTTP pour relier des capteurs IoT à faible débit.',
];

function defaultMaxTokensFor(modelId: string): number {
  return REASONING_ALIASES.has(modelId) ? REASONING_MAX_TOKENS : DEFAULT_MAX_TOKENS;
}

export function ChatPlayground({ modelId, modelDisplayName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [params, setParams] = useState<ChatParams>({
    temperature: 0.7,
    max_tokens: defaultMaxTokensFor(modelId),
    system_prompt: '',
  });

  // When the user switches model in the parent route, lift max_tokens to
  // the reasoning default — but only if they haven't customized it (still
  // sitting on the generic default). This preserves user overrides.
  useEffect(() => {
    setParams((p) => {
      const isReasoning = REASONING_ALIASES.has(modelId);
      const stillAtDefault =
        p.max_tokens === DEFAULT_MAX_TOKENS || p.max_tokens === REASONING_MAX_TOKENS;
      if (!stillAtDefault) return p;
      const target = isReasoning ? REASONING_MAX_TOKENS : DEFAULT_MAX_TOKENS;
      return p.max_tokens === target ? p : { ...p, max_tokens: target };
    });
  }, [modelId]);
  const { assistantText, isStreaming, error, send, stop } = useChatStream();

  const handleSubmit = async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    const reply = await send(modelId, next, params);
    if (reply) {
      setMessages([...next, { role: 'assistant', content: reply }]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[80vh] gap-4">
      <header>
        <h2 className="font-bold text-xl">Chat — {modelDisplayName}</h2>
        <p className="text-xs text-slate-500">{modelId}</p>
        <p
          role="note"
          className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          <span aria-hidden>⚠️ </span>
          You are interacting with an AI. Replies may be inaccurate, biased, or fabricated and must
          not be treated as professional advice. See the{' '}
          <a className="underline font-medium" href="/transparency">
            transparency page
          </a>{' '}
          for model provenance and limitations.
        </p>
      </header>

      <ParamsPanel value={params} onChange={setParams} />

      <div className="flex-1 overflow-y-auto rounded border border-slate-200 p-4 flex flex-col gap-3">
        {messages.length === 0 && !isStreaming && !error && (
          <div className="m-auto w-full max-w-md text-center">
            <p className="text-sm text-slate-500">
              Posez votre première question à {modelDisplayName}.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setInputText(p)}
                  className="rounded border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble
            // biome-ignore lint/suspicious/noArrayIndexKey: chat history is append-only, never reordered
            key={`msg-${i}`}
            speaker={m.role as 'user' | 'assistant'}
            content={m.content}
          />
        ))}
        {isStreaming && <MessageBubble speaker="assistant" content={assistantText} streaming />}
        {error && <p className="text-rose-700 text-sm">Error: {error}</p>}
      </div>

      <PromptInput
        value={inputText}
        onChange={setInputText}
        onSubmit={handleSubmit}
        disabled={isStreaming}
      />
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

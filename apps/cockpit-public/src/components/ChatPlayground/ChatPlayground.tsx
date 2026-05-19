import { type ChatMessage, useChatStream } from '@/hooks/useChatStream';
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

  const isEmpty = messages.length === 0 && !isStreaming && !error;

  return (
    <>
      <div className="chat-banner">
        <span className="live">
          <span className="dot" />
          {modelDisplayName}
        </span>
        <span>SSE streaming</span>
      </div>

      <p className="chat-note" role="note">
        <span aria-hidden>⚠ </span>
        Réponses générées par IA — potentiellement inexactes, biaisées ou fabriquées, à ne pas
        traiter comme un avis professionnel. Voir la <a href="/transparency">démarche qualité</a>.
      </p>

      <ParamsPanel value={params} onChange={setParams} />

      <div className="chat-body">
        {isEmpty && (
          <div className="chat-empty">
            <p>
              Posez votre première question à <em>{modelDisplayName}</em>.
            </p>
            <div className="chat-empty-prompts">
              {EXAMPLE_PROMPTS.map((p) => (
                <button type="button" key={p} onClick={() => setInputText(p)}>
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
        {error && <p className="chat-error">Erreur : {error}</p>}
      </div>

      <PromptInput
        value={inputText}
        onChange={setInputText}
        onSubmit={handleSubmit}
        streaming={isStreaming}
        onStop={stop}
      />
    </>
  );
}

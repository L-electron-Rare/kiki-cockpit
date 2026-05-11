import ReactMarkdown from 'react-markdown';

interface Props {
  speaker: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export function MessageBubble({ speaker, content, streaming }: Props) {
  const align =
    speaker === 'user'
      ? 'ml-auto bg-slate-100 text-slate-900'
      : 'mr-auto bg-emerald-50 text-slate-900';
  // During the gap between request and first token (Cloudflare can buffer SSE
  // for several seconds before any chunk reaches the client) show three
  // pulsing dots so the user gets immediate feedback.
  const isThinking = streaming && !content;
  return (
    <div className={`max-w-[75%] rounded-lg p-3 ${align}`}>
      {isThinking ? (
        <span aria-label="thinking" className="inline-flex items-center gap-1 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-thinking-dot [animation-delay:-0.32s]" />
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-thinking-dot [animation-delay:-0.16s]" />
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-thinking-dot" />
        </span>
      ) : (
        <>
          <ReactMarkdown>{content}</ReactMarkdown>
          {streaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-emerald-500 animate-pulse align-text-bottom" />
          )}
        </>
      )}
    </div>
  );
}

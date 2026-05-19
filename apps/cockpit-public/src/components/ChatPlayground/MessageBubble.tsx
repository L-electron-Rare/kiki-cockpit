import ReactMarkdown from 'react-markdown';

interface Props {
  speaker: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export function MessageBubble({ speaker, content, streaming }: Props) {
  // Between the request and the first token, Cloudflare can buffer the SSE
  // stream for several seconds — show pulsing dots so the user gets
  // immediate feedback that something is happening.
  const isThinking = streaming && !content;
  return (
    <div className={`msg ${speaker}`}>
      <div className={`who ${speaker}`}>{speaker === 'user' ? 'vous' : 'ailiance'}</div>
      <div className="body">
        {isThinking ? (
          <span className="chat-thinking" aria-label="réflexion en cours">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <>
            <ReactMarkdown>{content}</ReactMarkdown>
            {streaming && <span className="cursor-blink" />}
          </>
        )}
      </div>
    </div>
  );
}

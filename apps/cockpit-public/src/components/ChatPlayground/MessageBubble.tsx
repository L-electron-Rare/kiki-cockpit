import ReactMarkdown from 'react-markdown';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export function MessageBubble({ role, content, streaming }: Props) {
  const align = role === 'user' ? 'ml-auto bg-slate-100' : 'mr-auto bg-emerald-50';
  return (
    <div className={`max-w-[75%] rounded-lg p-3 ${align}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
      {streaming && <span className="inline-block w-2 h-4 ml-1 bg-emerald-500 animate-pulse" />}
    </div>
  );
}

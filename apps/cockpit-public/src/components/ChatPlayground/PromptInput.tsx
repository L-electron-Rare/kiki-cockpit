import { Paperclip, Send, X } from 'lucide-react';
import { type ChangeEvent, type KeyboardEvent, useRef, useState } from 'react';

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

// Mirrors the gateway's /v1/files/extract supported list. Kept in sync
// with src/gateway/file_extract.py — if a new format is added there,
// add the matching MIME and extension here too.
const ACCEPT_TYPES = [
  // Documents
  '.pdf',
  '.docx',
  '.xlsx',
  '.pptx',
  '.txt',
  '.md',
  '.html',
  '.htm',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/html',
  // Images — gateway OCRs them via Tesseract (ailiance/ailiance#90)
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
  '.tiff',
  '.tif',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/tiff',
].join(',');

// Gateway extract endpoint. Public host so the static cockpit doesn't
// have to know the internal gateway address.
const EXTRACT_URL = `${import.meta.env.VITE_AILIANCE_GATEWAY_URL ?? 'https://gateway.ailiance.fr'}/v1/files/extract`;

interface ExtractedAttachment {
  filename: string;
  format: string;
  markdown: string;
  truncated?: boolean;
}

export function PromptInput({ onSubmit, disabled }: Props) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<ExtractedAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const composePayload = (): string => {
    // Prepend the attachment's extracted markdown so the LLM sees the
    // document context before the user's free-form prompt. Order matters
    // for some templates — context first, instruction second.
    if (!attachment) return text.trim();
    const userText = text.trim();
    const intro = userText
      ? userText
      : `Please analyze the attached ${attachment.format.toUpperCase()} file.`;
    const truncNote = attachment.truncated
      ? '\n\n[note: file was truncated by the server to fit prompt limits]'
      : '';
    return `Attached file: ${attachment.filename}\n\n\`\`\`markdown\n${attachment.markdown}\n\`\`\`${truncNote}\n\n${intro}`;
  };

  const handleSubmit = () => {
    if (disabled) return;
    const payload = composePayload();
    if (!payload) return;
    onSubmit(payload);
    setText('');
    setAttachment(null);
    setUploadError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always clear the input so re-selecting the same file refires onChange.
    if (e.target) e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const resp = await fetch(EXTRACT_URL, { method: 'POST', body: form });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        const msg = body?.detail?.message ?? body?.detail ?? `Upload failed (HTTP ${resp.status})`;
        setUploadError(String(msg));
        return;
      }
      const body = await resp.json();
      setAttachment({
        filename: body.filename ?? file.name,
        format: body.format,
        markdown: body.markdown ?? '',
        truncated: body.metadata?.truncated === true,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const canSend = !disabled && !uploading && (text.trim().length > 0 || attachment !== null);

  return (
    <div className="space-y-2">
      {attachment && (
        <div className="flex items-center gap-2 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <span className="font-mono">{attachment.filename}</span>
          <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            {attachment.format}
          </span>
          <span className="text-emerald-700">
            {attachment.markdown.length.toLocaleString()} chars
          </span>
          {attachment.truncated && (
            <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] uppercase text-amber-900">
              truncated
            </span>
          )}
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="ml-auto rounded p-0.5 hover:bg-emerald-200"
            aria-label="Remove attachment"
          >
            <X size={12} />
          </button>
        </div>
      )}
      {uploadError && (
        <p role="alert" className="text-xs text-rose-700">
          {uploadError}
        </p>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES}
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          aria-label="Attach a file"
          title="Attach a file (PDF/DOCX/XLSX/PPTX/TXT/MD/HTML) or image (PNG/JPG/etc., OCR'd server-side)"
          className="rounded border border-slate-300 bg-white px-3 text-slate-700 disabled:opacity-50 hover:bg-slate-100"
        >
          <Paperclip size={16} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            uploading
              ? 'Extracting file…'
              : attachment
                ? 'Ask a question about the attached file…'
                : 'Type a message…'
          }
          rows={3}
          disabled={disabled || uploading}
          className="flex-1 rounded border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          className="rounded bg-emerald-600 px-4 text-white disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

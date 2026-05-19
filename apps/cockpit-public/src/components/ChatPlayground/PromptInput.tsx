import { Paperclip, Send, Square, X } from 'lucide-react';
import { type ChangeEvent, type KeyboardEvent, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string) => void;
  /** A reply is currently streaming — the send button becomes a stop button. */
  streaming?: boolean;
  onStop?: () => void;
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

export function PromptInput({ value, onChange, onSubmit, streaming, onStop }: Props) {
  const [attachment, setAttachment] = useState<ExtractedAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const composePayload = (): string => {
    // Prepend the attachment's extracted markdown so the LLM sees the
    // document context before the user's free-form prompt. Order matters
    // for some templates — context first, instruction second.
    if (!attachment) return value.trim();
    const userText = value.trim();
    const intro = userText
      ? userText
      : `Analyse le fichier ${attachment.format.toUpperCase()} ci-joint.`;
    const truncNote = attachment.truncated
      ? '\n\n[note : le fichier a été tronqué par le serveur pour tenir dans les limites du prompt]'
      : '';
    return `Fichier joint : ${attachment.filename}\n\n\`\`\`markdown\n${attachment.markdown}\n\`\`\`${truncNote}\n\n${intro}`;
  };

  const handleSubmit = () => {
    if (streaming || uploading) return;
    const payload = composePayload();
    if (!payload) return;
    onSubmit(payload);
    onChange('');
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
        const msg =
          body?.detail?.message ?? body?.detail ?? `Échec de l'envoi (HTTP ${resp.status})`;
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
      setUploadError(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setUploading(false);
    }
  };

  const canSend = !streaming && !uploading && (value.trim().length > 0 || attachment !== null);

  return (
    <div className="chat-input-wrap">
      {attachment && (
        <div className="chat-attach">
          <span className="chat-attach-name">{attachment.filename}</span>
          <span className="chat-attach-tag">{attachment.format}</span>
          <span className="chat-attach-size">
            {attachment.markdown.length.toLocaleString()} car.
          </span>
          {attachment.truncated && <span className="chat-attach-warn">tronqué</span>}
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="chat-attach-x"
            aria-label="Retirer la pièce jointe"
          >
            <X size={12} />
          </button>
        </div>
      )}
      {uploadError && (
        <p role="alert" className="chat-error">
          {uploadError}
        </p>
      )}
      <div className="chat-input">
        <input ref={fileInputRef} type="file" accept={ACCEPT_TYPES} onChange={handleFile} hidden />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={streaming || uploading}
          className="chat-icon-btn"
          aria-label="Joindre un fichier"
          title="Joindre un fichier (PDF/DOCX/XLSX/PPTX/TXT/MD/HTML) ou une image (PNG/JPG/etc., OCR côté serveur)"
        >
          <Paperclip size={16} />
        </button>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            uploading
              ? 'Extraction du fichier…'
              : attachment
                ? 'Posez une question sur le fichier joint…'
                : 'Écrivez un message…'
          }
          rows={1}
          disabled={streaming || uploading}
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="chat-stop"
            aria-label="Arrêter la génération"
          >
            <Square size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend}
            className="chat-send"
            aria-label="Envoyer"
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

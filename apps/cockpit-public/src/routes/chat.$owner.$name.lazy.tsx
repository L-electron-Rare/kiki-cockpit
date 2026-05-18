import { ChatPlayground } from '@/components/ChatPlayground/ChatPlayground';
import { createLazyFileRoute } from '@tanstack/react-router';

export const Route = createLazyFileRoute('/chat/$owner/$name')({
  component: ChatPage,
});

function ChatPage() {
  const { model } = Route.useLoaderData();

  if (!model.chat_eligible) {
    return (
      <main>
        <section className="wrap page-head">
          <div className="kicker">
            <span className="num">№ 03</span> · playground
          </div>
          <h1 className="display">{model.display_name}</h1>
        </section>
        <section className="wrap" style={{ paddingTop: 32 }}>
          <p
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 13,
              color: 'var(--ink-3)',
              borderLeft: '3px solid var(--warn)',
              paddingLeft: 14,
            }}
          >
            Ce modèle n'est pas éligible au chat.{' '}
            <a
              href={model.hf_url}
              style={{ color: 'var(--accent)', textDecoration: 'underline' }}
            >
              Voir sur HuggingFace
            </a>
            .
          </p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="wrap page-head">
        <div className="kicker">
          <span className="num">№ 03</span> · playground · SSE streaming
        </div>
        <h1 className="display">
          Parlez à <em>{model.display_name}</em>.
        </h1>
      </section>
      <section className="wrap" style={{ paddingBottom: 80 }}>
        <div className="chat-shell">
          <aside className="chat-left">
            <div className="panel-section">
              <h4>Modèle</h4>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                  {model.display_name}
                </div>
                <div style={{ color: 'var(--ink-4)', wordBreak: 'break-all' }}>
                  {model.id}
                </div>
                {model.domain && (
                  <div style={{ marginTop: 8 }}>
                    <span
                      style={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontSize: 10,
                        color: 'var(--ink-5)',
                      }}
                    >
                      domaine
                    </span>{' '}
                    {model.domain}
                  </div>
                )}
              </div>
            </div>
            <div className="panel-section">
              <h4>Politique de logs</h4>
              <p
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--mono)',
                  color: 'var(--ink-3)',
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                Le contenu de cette conversation n'est pas persisté sur disque. Seules les métriques
                (timestamps, comptage de tokens, latence) sont retenues 30 jours pour rate-limit.
              </p>
            </div>
          </aside>

          <div className="chat-center">
            <ChatPlayground modelId={model.id} modelDisplayName={model.display_name} />
          </div>

          <aside className="chat-right">
            <div className="panel-section">
              <h4>Métriques</h4>
              <div className="kv">
                {/* TODO: wire to /api/public/chat/proxy telemetry response */}
                <span className="k">latence</span>
                <span className="v tnum">— ms</span>
                <span className="k">tokens/s</span>
                <span className="v tnum">—</span>
                <span className="k">backend</span>
                <span className="v">{model.chat_backend}</span>
              </div>
            </div>
            {model.top_eval_score != null && (
              <div className="panel-section">
                <h4>Meilleur score eval</h4>
                <div className="kv">
                  <span className="k">{model.top_eval_benchmark ?? 'bench'}</span>
                  <span className="v tnum">{(model.top_eval_score * 100).toFixed(1)} %</span>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

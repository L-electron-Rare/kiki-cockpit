import { ChatPlayground } from '@/components/ChatPlayground/ChatPlayground';
import { useModels } from '@/hooks/useModels';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/chat')({
  component: PlaygroundPage,
});

interface SelectedModel {
  owner: string;
  name: string;
  id: string;
  displayName: string;
}

function PlaygroundPage() {
  const models = useModels();
  const [selected, setSelected] = useState<SelectedModel | null>(null);

  // Place the auto-router first, then the rest (chat_eligible).
  const chatEligible = (models.data?.filter((m) => m.chat_eligible) ?? []).slice().sort((a, b) => {
    if (a.id.endsWith('/auto')) return -1;
    if (b.id.endsWith('/auto')) return 1;
    return (a.featured_rank ?? 999) - (b.featured_rank ?? 999);
  });

  // Default to the auto-router; fallback to first featured / first eligible.
  const defaultModel =
    chatEligible.find((m) => m.id.endsWith('/auto')) ??
    chatEligible.find((m) => m.status === 'featured') ??
    chatEligible[0] ??
    null;

  const active: SelectedModel | null =
    selected ??
    (defaultModel
      ? {
          owner: defaultModel.owner,
          name: defaultModel.name,
          id: defaultModel.id,
          displayName: defaultModel.display_name,
        }
      : null);

  return (
    <main>
      <section className="wrap page-head">
        <div className="kicker">
          <span className="num">№ 03</span> · playground · SSE streaming
        </div>
        <h1 className="display">
          Parlez à la <em>flotte</em>.
        </h1>
      </section>

      <section className="wrap" style={{ paddingBottom: 80 }}>
        {models.isLoading && (
          <p
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 12,
              color: 'var(--ink-4)',
              paddingTop: 24,
            }}
          >
            Chargement des modèles…
          </p>
        )}
        {models.isError && (
          <p
            style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--bad)', paddingTop: 24 }}
          >
            Impossible de charger la liste des modèles.
            {/* TODO: wire to /api/public/models error handling */}
          </p>
        )}

        {!models.isLoading && (
          <div className="chat-shell">
            {/* LEFT — model picker */}
            <aside className="chat-left">
              <div className="panel-section">
                <h4>Modèle servi</h4>
                {chatEligible.length === 0 && !models.isLoading && (
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                    Aucun modèle disponible.
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {chatEligible.map((m) => {
                    const isActive = active?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setSelected({
                            owner: m.owner,
                            name: m.name,
                            id: m.id,
                            displayName: m.display_name,
                          })
                        }
                        style={{
                          textAlign: 'left',
                          background: isActive ? 'var(--ink)' : 'transparent',
                          color: isActive ? 'var(--paper)' : 'var(--ink-2)',
                          border: `1px solid ${isActive ? 'var(--ink)' : 'var(--rule)'}`,
                          padding: '8px 10px',
                          cursor: 'pointer',
                          fontFamily: 'var(--sans)',
                          width: '100%',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.display_name}</div>
                        <div
                          style={{
                            fontSize: 10,
                            fontFamily: 'var(--mono)',
                            opacity: 0.65,
                            marginTop: 2,
                          }}
                        >
                          {m.id}
                          {m.status === 'featured' && (
                            <span
                              style={{
                                marginLeft: 6,
                                color: isActive ? 'var(--accent-soft)' : 'var(--accent)',
                              }}
                            >
                              ★
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* CENTER — chat zone */}
            <div className="chat-center">
              {active ? (
                <ChatPlayground modelId={active.id} modelDisplayName={active.displayName} />
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    color: 'var(--ink-4)',
                    padding: '40px 28px',
                  }}
                >
                  Sélectionnez un modèle pour démarrer.
                </div>
              )}
            </div>

            {/* RIGHT — info panel */}
            <aside className="chat-right">
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
                  Le contenu de cette conversation n'est pas persisté sur disque. Seules les
                  métriques (timestamps, comptage de tokens, latence) sont retenues 30 jours pour
                  rate-limit.
                </p>
              </div>
              {active && (
                <div className="panel-section">
                  <h4>Modèle actif</h4>
                  <div className="kv">
                    <span className="k">id</span>
                    <span className="v" style={{ wordBreak: 'break-all' }}>
                      {active.id}
                    </span>
                    <span className="k">owner</span>
                    <span className="v">{active.owner}</span>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

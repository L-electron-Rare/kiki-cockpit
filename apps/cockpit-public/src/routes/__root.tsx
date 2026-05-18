import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Topstrip } from '@/components/layout/Topstrip';
import { SITE_URL } from '@/lib/seo';
import { getTelemetry } from '@/lib/server-fns';
import type { components } from '@cockpit/shared';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { Suspense, lazy, useEffect } from 'react';

type TelemetryResponse = components['schemas']['TelemetryResponse'];

import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@/index.css';
import '@/styles.css';

// Dev-only: the ternary folds to null in production (import.meta.env.DEV === false),
// so Vite tree-shakes the entire TweaksPanel module from the prod bundle.
const TweaksPanel = import.meta.env.DEV ? lazy(() => import('@/components/dev/TweaksPanel')) : null;

// P0 SSR fix: the theme pref read (localStorage + matchMedia) ran as an
// inline <script> in index.html. It must run before paint to avoid a
// flash, and must NOT run during SSR. Keep it as a pre-hydration inline
// script injected into <head>.
const THEME_INIT =
  `(function(){try{var s=localStorage.getItem('theme');` +
  `var t=s?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?` +
  `'dark':'paper');document.documentElement.dataset.theme=t;` +
  `document.documentElement.dataset.density='comfortable';}catch(e){}})();`;

// Static structured data (schema.org). Rendered server-side as a
// <script type="application/ld+json"> so crawlers index it without JS.
const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#org`,
      name: 'Ailiance',
      url: SITE_URL,
      description:
        'Infrastructure LLM européenne souveraine : flotte de modèles spécialisés open-weights opérée depuis du matériel personnel en France.',
      sameAs: ['https://github.com/ailiance', 'https://huggingface.co/Ailiance-fr'],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Ailiance',
      inLanguage: 'fr-FR',
      publisher: { '@id': `${SITE_URL}/#org` },
    },
  ],
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#1c3fbb' },
      { title: 'Ailiance — Flotte LLM souveraine' },
      {
        name: 'description',
        content:
          'Flotte de LLM spécialisés open-weights, opérée depuis du matériel personnel en France. Frameworks de modèles, intégration, formation et schémas PCB sous Apache-2.0.',
      },
      { property: 'og:site_name', content: 'Ailiance' },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'fr_FR' },
      { property: 'og:image', content: `${SITE_URL}/og-default.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Ailiance — flotte LLM souveraine' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: `${SITE_URL}/og-default.png` },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }),
  loader: async (): Promise<{ telemetry: TelemetryResponse | null }> => {
    try {
      return { telemetry: await getTelemetry() };
    } catch {
      // Topstrip telemetry is decorative; never break a page render.
      return { telemetry: null };
    }
  },
  component: RootLayout,
  notFoundComponent: () => (
    <RootDocument telemetry={null}>
      <main className="wrap" style={{ padding: '64px 0' }}>
        <h1 className="display">404 — page introuvable.</h1>
      </main>
    </RootDocument>
  ),
  errorComponent: ({ error }) => (
    <RootDocument telemetry={null}>
      <main className="wrap" style={{ padding: '64px 0' }}>
        <h1 className="display">Erreur.</h1>
        <p style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
          {error instanceof Error ? error.message : 'Erreur inattendue.'}
        </p>
      </main>
    </RootDocument>
  ),
});

function RootLayout() {
  const { telemetry } = Route.useLoaderData();
  return (
    <RootDocument telemetry={telemetry}>
      <main
        className="wrap"
        style={{ flex: 1, paddingTop: 'var(--pad)', paddingBottom: 'var(--pad)' }}
      >
        <Outlet />
      </main>
    </RootDocument>
  );
}

function RootDocument({
  children,
  telemetry,
}: {
  children: React.ReactNode;
  telemetry: TelemetryResponse | null;
}) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        document.documentElement.dataset.theme = e.matches ? 'dark' : 'paper';
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <html lang="fr">
      <head>
        <HeadContent />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: pre-hydration theme script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static schema.org JSON-LD, no user input */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      </head>
      <body>
        <div className="min-h-screen flex flex-col bg-paper text-ink">
          <Topstrip telemetry={telemetry} />
          <Header />
          {children}
          <Footer />
          {TweaksPanel && (
            <Suspense fallback={null}>
              <TweaksPanel />
            </Suspense>
          )}
        </div>
        <Scripts />
      </body>
    </html>
  );
}

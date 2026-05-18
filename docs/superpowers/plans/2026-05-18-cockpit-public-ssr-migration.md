# cockpit-public SSR Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `apps/cockpit-public` from a Vite CSR SPA to TanStack Start SSR, in place, so every route is server-rendered and the raw HTML contains the page content.

**Architecture:** TanStack Start = TanStack Router + a server layer (Nitro). Routes, components and `styles.css` are kept; the data layer moves from `@tanstack/react-query` hooks to route `loader`s + `createServerFn`. The deployment changes from an nginx-static container to a Node server.

**Tech Stack:** React 19, TanStack Start (`@tanstack/react-start`), TanStack Router, Nitro, Vite, pnpm monorepo, Docker Compose + Traefik.

**Spec:** `docs/superpowers/specs/2026-05-18-cockpit-public-ssr-migration-design.md`

---

## Important execution notes

- **A broken build is expected mid-migration.** Approach A (in-place) was chosen knowing this. Work on branch `feat/cockpit-public-ssr-migration`. The build returns green at the end of Phase B (Task 13) and stays green after.
- **`@tanstack/react-query` is kept transitionally** through Phases A and B so un-migrated routes keep working, and removed in Phase C.
- **Framework boilerplate must match the installed version.** TanStack Start evolves fast. For Tasks 2–6, after installing `@tanstack/react-start`, the implementer MUST cross-check the entry/config code against the official migration guide for the *installed* version (`node_modules/@tanstack/react-start` README / tanstack.com/start docs). The code shown here reflects the current docs and is a strong baseline, not a version-locked contract.
- Commit messages: subject ≤ 50 chars, body ≤ 72 chars, no AI attribution, no `--no-verify`, no underscore in scope.

## File structure

| File | Change | Task |
|------|--------|------|
| `apps/cockpit-public/package.json` | deps + scripts | 1, 14 |
| `apps/cockpit-public/vite.config.ts` | Start + Nitro plugins | 2 |
| `apps/cockpit-public/tsconfig.json` | Start types | 2 |
| `apps/cockpit-public/src/router.tsx` | `getRouter()` factory | 3 |
| `apps/cockpit-public/src/routes/__root.tsx` | SSR root document | 5, 13 |
| `apps/cockpit-public/src/main.tsx` | deleted | 6 |
| `apps/cockpit-public/index.html` | deleted (head ported to root) | 6 |
| `apps/cockpit-public/src/queryClient.ts` | deleted | 14 |
| `apps/cockpit-public/src/lib/server-api.ts` | created — server API client | 7 |
| `apps/cockpit-public/src/routes/*.tsx` (stubs) | gain `loader`s | 8–12 |
| `apps/cockpit-public/src/routes/*.lazy.tsx` | hooks → `useLoaderData` | 8–12 |
| `apps/cockpit-public/src/hooks/use*.ts` | 7 deleted, `useChatStream` kept | 14 |
| `apps/cockpit-public/src/components/layout/Footer.tsx` | SSR-safe date | 15 |
| `apps/cockpit-public/src/components/dev/TweaksPanel.tsx` | SSR guard | 15 |
| `Dockerfile` | `public` target → Node runtime | 16 |
| `deploy/docker-compose.yml` | `public`/`preview` services | 17 |
| `deploy/traefik-dynamic/ailiance-demo.yml` | backend port | 17 |

---

## Phase A — Start runtime

Goal of Phase A: the app boots and server-renders. Static routes (`/about`, `/bench`, `/transparency`) show full content in raw HTML. Data routes SSR their shell (data still client-fetched via react-query, transitionally).

### Task 1: Install TanStack Start, update package.json

**Files:**
- Modify: `apps/cockpit-public/package.json`

- [ ] **Step 1: Add Start + Nitro, update scripts**

In `dependencies` add `"@tanstack/react-start": "^1.131.0"`. In `devDependencies` add `"nitro": "^3.0.0"` and `"@tanstack/react-router-devtools": "^1.131.0"`. Keep `@tanstack/react-query` for now (removed in Task 14). Replace the `scripts` block with:

```json
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "preview": "vite preview",
    "test": "vitest run --passWithNoTests",
    "typecheck": "tsc --noEmit"
  },
```

`tsr generate` is dropped — the Start Vite plugin generates the route tree.

- [ ] **Step 2: Install and pin versions**

Run from repo root: `pnpm --filter cockpit-public install`
Then resolve the actual installed Start version: `pnpm --filter cockpit-public list @tanstack/react-start`
Expected: a version installs cleanly. If `^1.131.0` is unavailable, install `@tanstack/react-start@latest` and record the version — Tasks 2–6 are checked against it.

- [ ] **Step 3: Commit**

```bash
cd /Users/electron/ailiance-demo
git add apps/cockpit-public/package.json pnpm-lock.yaml
git commit -m "build(public): add tanstack start and nitro deps"
```

### Task 2: Vite + TypeScript config for Start

**Files:**
- Modify: `apps/cockpit-public/vite.config.ts`
- Modify: `apps/cockpit-public/tsconfig.json`

- [ ] **Step 1: Rewrite `vite.config.ts`**

Replace the whole file with:

```ts
import path from 'node:path';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:9100', changeOrigin: false },
    },
  },
  plugins: [
    tanstackStart({
      srcDirectory: 'src',
      router: { routesDirectory: 'src/routes' },
    }),
    react(),
    nitro(),
  ],
});
```

Notes: the custom `manualChunks` block is dropped — Start/Nitro manage bundling. The `/api` dev proxy is kept (the client still calls `/api` for the chat stream). Cross-check the `tanstackStart` import path and options against the installed version's docs.

- [ ] **Step 2: Update `tsconfig.json`**

Keep the file as-is except: this stays a DOM app (it hydrates in the browser), so `lib` remains `["ES2022", "DOM", "DOM.Iterable"]`. Add `"types": ["vite/client"]` to `compilerOptions` if not resolved. No other change needed.

- [ ] **Step 3: Commit**

```bash
git add apps/cockpit-public/vite.config.ts apps/cockpit-public/tsconfig.json
git commit -m "build(public): switch vite config to start plugin"
```

### Task 3: Router factory

**Files:**
- Modify: `apps/cockpit-public/src/router.tsx`

- [ ] **Step 1: Convert to a `getRouter()` factory**

Start recreates the router per request on the server. Replace the file with:

```tsx
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
  });
  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/cockpit-public/src/router.tsx
git commit -m "refactor(public): router as per-request factory"
```

### Task 4: Start entry points

**Files:**
- Create: the server/client entry files Start requires (names per installed version — typically `src/server.tsx` + `src/client.tsx`, or auto-provided).

- [ ] **Step 1: Add entry files per the installed Start version**

Modern `@tanstack/react-start` auto-provides default server/client entries when only `getRouter` exists; some versions need explicit `src/server.tsx` and `src/client.tsx`. Check the installed version's "build from scratch" guide. The explicit form is:

```tsx
// src/client.tsx
import { StartClient } from '@tanstack/react-start/client';
import { hydrateRoot } from 'react-dom/client';
import { getRouter } from './router';

hydrateRoot(document, <StartClient router={getRouter()} />);
```

```tsx
// src/server.tsx
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import { getRouter } from './router';

export default createStartHandler({ getRouter })(defaultStreamHandler);
```

If the installed version auto-wires entries from `getRouter`, skip the explicit files and rely on the default — verify by building in Task 6.

- [ ] **Step 2: Commit**

```bash
git add apps/cockpit-public/src/client.tsx apps/cockpit-public/src/server.tsx 2>/dev/null; git commit -m "feat(public): add start server and client entries" || echo "no explicit entries needed"
```

### Task 5: Root document with SSR `<head>`

**Files:**
- Modify: `apps/cockpit-public/src/routes/__root.tsx`

- [ ] **Step 1: Convert `__root.tsx` to a Start root document**

The current `index.html` `<head>` (charset, viewport, `lang="fr"`, the single `<title>`, the theme inline script) and `main.tsx`'s CSS/font imports move here. Replace `__root.tsx` with:

```tsx
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Topstrip } from '@/components/layout/Topstrip';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import { Suspense, lazy, useEffect } from 'react';

import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@/index.css';
import '@/styles.css';

const TweaksPanel = import.meta.env.DEV
  ? lazy(() => import('@/components/dev/TweaksPanel'))
  : null;

// P0 SSR fix: the theme pref read (localStorage + matchMedia) ran as an
// inline <script> in index.html. It must run before paint to avoid a
// flash, and must NOT run during SSR. Keep it as a pre-hydration inline
// script injected into <head>.
const THEME_INIT = `(function(){try{var s=localStorage.getItem('theme');` +
  `var t=s?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?` +
  `'dark':'paper');document.documentElement.dataset.theme=t;` +
  `document.documentElement.dataset.density='comfortable';}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'AILIANCE LLM Workflow — Ailiance' },
    ],
  }),
  component: RootLayout,
  notFoundComponent: () => (
    <RootDocument>
      <main className="wrap" style={{ padding: '64px 0' }}>
        <h1 className="display">404 — page introuvable.</h1>
      </main>
    </RootDocument>
  ),
  errorComponent: ({ error }) => (
    <RootDocument>
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
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
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
      </head>
      <body>
        <Topstrip />
        <Header />
        {children}
        <Footer />
        {TweaksPanel && (
          <Suspense fallback={null}>
            <TweaksPanel />
          </Suspense>
        )}
        <Scripts />
      </body>
    </html>
  );
}
```

Note: the current `__root.tsx` JSX wrapped `Topstrip`/`Header`/`Outlet`/`Footer` in `<div className="min-h-screen flex flex-col">`. Preserve that wrapper exactly as in the current file (read the current `__root.tsx` and keep its body markup) — the responsive fix `main.wrap { width: 100% }` depends on the flex-column shell. Only the `<html>/<head>/<body>` and head/script wiring are new.

- [ ] **Step 2: Commit**

```bash
git add apps/cockpit-public/src/routes/__root.tsx
git commit -m "feat(public): ssr root document with head"
```

### Task 6: Delete SPA entries, first SSR build

**Files:**
- Delete: `apps/cockpit-public/src/main.tsx`, `apps/cockpit-public/index.html`

- [ ] **Step 1: Delete the SPA entry files**

```bash
git rm apps/cockpit-public/src/main.tsx apps/cockpit-public/index.html
```

- [ ] **Step 2: Build**

Run: `pnpm --filter cockpit-public build`
Expected: the Start/Nitro build succeeds, producing `.output/`. If it fails, the cause is almost always a Task 2–5 mismatch with the installed Start version — fix against the version's docs. Report BLOCKED if the framework wiring cannot be resolved.

- [ ] **Step 3: Verify SSR of a static route**

Run: `pnpm --filter cockpit-public start &` then `curl -s http://localhost:3000/about | grep -c "Pourquoi cette flotte"`
Expected: `1` or more — the About page text is present in the raw HTML (proves SSR). Stop the server after.

- [ ] **Step 4: Commit**

```bash
git add -A apps/cockpit-public
git commit -m "feat(public): remove spa entry, app renders ssr"
```

---

## Phase B — Per-route data loaders

react-query stays installed; each task migrates one route from a hook to a `loader`, keeping the build green.

### Task 7: Server-side API client

**Files:**
- Create: `apps/cockpit-public/src/lib/server-api.ts`

- [ ] **Step 1: Create a server API client**

Loaders run on the server and must call the API by its internal Docker URL, not the relative `/api`. Create:

```ts
import { createApiClient } from '@cockpit/shared';

// Server-side base URL: in Docker the api service is reachable by name.
// Locally it is the dev API on 127.0.0.1:9100.
const SERVER_API_BASE =
  process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:9100';

export const serverApi = createApiClient({ baseUrl: SERVER_API_BASE });
```

If `@cockpit/shared`'s `createApiClient` references `window`/`fetch` at module scope, adjust it to be isomorphic (Node 20 has global `fetch`). Verify by reading `packages/shared/src` during this task.

- [ ] **Step 2: Commit**

```bash
git add apps/cockpit-public/src/lib/server-api.ts
git commit -m "feat(public): add server-side api client"
```

### Task 8: `/` home — useModels → loader

**Files:**
- Create: `apps/cockpit-public/src/lib/server-fns.ts`
- Modify: `apps/cockpit-public/src/routes/index.tsx`

- [ ] **Step 1: Create the server-fns module with `getModels`**

All server fns live in one module so routes share them (DRY). Create `apps/cockpit-public/src/lib/server-fns.ts`:

```ts
import { createServerFn } from '@tanstack/react-start';
import type { ModelCard } from '@cockpit/shared';
import { serverApi } from './server-api';

export const getModels = createServerFn({ method: 'GET' }).handler(
  async () => serverApi.get<ModelCard[]>('/api/public/models'),
);
```

- [ ] **Step 2: Add a loader, convert the component**

`index.tsx` is eager (not lazy) and its component calls `useModels()`. Import `getModels` from `@/lib/server-fns`, add the `loader`, and replace the hook with `Route.useLoaderData()`:

```tsx
import { getModels } from '@/lib/server-fns';
// ...existing imports, minus useModels

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async () => ({ models: await getModels() }),
});

function HomePage() {
  const { models } = Route.useLoaderData();
  const featured = models
    .filter((c) => c.chat_eligible)
    .sort(/* keep existing sort */)
    .slice(0, 6);
  // ...rest of JSX unchanged; drop the `isLoading` branch — SSR has data
}
```

Read the current `index.tsx` for the exact sort comparator and JSX; only the data source changes (`useModels()` → `Route.useLoaderData()`), and the `isLoading` placeholder branch is removed.

- [ ] **Step 3: Verify**

Run: `pnpm --filter cockpit-public build` → green.
`pnpm --filter cockpit-public start &` then `curl -s http://localhost:3000/ | grep -c "souveraine"` → ≥ 1 (home content server-rendered).

- [ ] **Step 4: Commit**

```bash
git add apps/cockpit-public/src/lib/server-fns.ts apps/cockpit-public/src/routes/index.tsx
git commit -m "feat(public): server-load models on home route"
```

### Task 9: `/models/` — useModels + useStatus → loader

**Files:**
- Modify: `apps/cockpit-public/src/routes/models.index.tsx` (stub — add loader)
- Modify: `apps/cockpit-public/src/routes/models.index.lazy.tsx` (component)

- [ ] **Step 1: Add `getStatus` to `server-fns.ts`, then the loader**

Append `getStatus` to the existing `apps/cockpit-public/src/lib/server-fns.ts` (created in Task 8):

```ts
import type { StatusReport } from '@cockpit/shared';

export const getStatus = createServerFn({ method: 'GET' }).handler(
  async () => serverApi.get<StatusReport>('/api/public/status'),
);
```

Then `models.index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { getModels, getStatus } from '@/lib/server-fns';

export const Route = createFileRoute('/models/')({
  loader: async () => ({
    models: await getModels(),
    status: await getStatus(),
  }),
});
```

- [ ] **Step 2: Convert the component**

In `models.index.lazy.tsx`, replace `useModels()` and `useStatus()` with `Route.useLoaderData()` (the lazy file's route is the same `Route`). Drop loading branches. Keep `useMemo` and all JSX.

- [ ] **Step 3: Verify & commit**

`build` green; `curl -s http://localhost:3000/models | grep -c auto-router` ≥ 1.

```bash
git add apps/cockpit-public/src/lib/server-fns.ts apps/cockpit-public/src/routes/models.index.tsx apps/cockpit-public/src/routes/models.index.lazy.tsx
git commit -m "feat(public): server-load models index route"
```

### Task 10: `/models/$owner/$name` — 4 hooks → loader

**Files:**
- Modify: `apps/cockpit-public/src/routes/models.$owner.$name.tsx`
- Modify: `apps/cockpit-public/src/routes/models.$owner.$name.lazy.tsx`
- Modify: `apps/cockpit-public/src/lib/server-fns.ts`

- [ ] **Step 1: Add param-aware server fns**

Add to `server-fns.ts` (`createServerFn` with `.inputValidator` for the params):

```ts
import type { ModelCard, EvalSummary, MascaradeLora } from '@cockpit/shared';

export const getModelDetail = createServerFn({ method: 'GET' })
  .inputValidator((d: { owner: string; name: string }) => d)
  .handler(async ({ data }) =>
    serverApi.get<ModelCard>(`/api/public/models/${data.owner}/${data.name}`),
  );

export const getEvalScores = createServerFn({ method: 'GET' })
  .inputValidator((d: { owner: string; name: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await serverApi.get<EvalSummary>(
        `/api/public/eval/${data.owner}/${data.name}`,
      );
    } catch {
      return null; // 404 = no eval, matches current useEvalScores behaviour
    }
  });

export const getMascaradeLoras = createServerFn({ method: 'GET' }).handler(
  async () =>
    serverApi.get<MascaradeLora[]>(
      '/api/public/models/ailiance/mascarade/loras',
    ),
);
```

`useProvenance` fetches a static GitHub raw URL with a fixed filename map. Add a `getProvenance` server fn that takes `modelId`, looks up the same `PROVENANCE_FILES` map, and `fetch`es the GitHub raw URL (return `null` if no mapping or non-200).

- [ ] **Step 2: Loader in the route stub**

```tsx
export const Route = createFileRoute('/models/$owner/$name')({
  loader: async ({ params }) => {
    const model = await getModelDetail({ data: params });
    const isMascarade = /* same predicate the component used for useMascaradeLoras */;
    return {
      model,
      evalScores: await getEvalScores({ data: params }),
      loras: isMascarade ? await getMascaradeLoras() : [],
      provenance: await getProvenance({ data: { modelId: `${params.owner}/${params.name}` } }),
    };
  },
});
```

- [ ] **Step 3: Convert the component** in `models.$owner.$name.lazy.tsx` — replace the 4 hooks with `Route.useLoaderData()` destructuring. Drop loading branches.

- [ ] **Step 4: Verify & commit**

`build` green; pick a real slug from `/models` and `curl` it — model name present in HTML.

```bash
git add apps/cockpit-public/src/routes/models.\$owner.\$name.tsx apps/cockpit-public/src/routes/models.\$owner.\$name.lazy.tsx apps/cockpit-public/src/lib/server-fns.ts
git commit -m "feat(public): server-load model detail route"
```

### Task 11: `/chat` and `/chat/$owner/$name` — loader; stream stays client

**Files:**
- Modify: `apps/cockpit-public/src/routes/chat.tsx`, `chat.lazy.tsx`
- Modify: `apps/cockpit-public/src/routes/chat.$owner.$name.tsx`, `chat.$owner.$name.lazy.tsx`

- [ ] **Step 1: Loaders**

`chat.tsx`: `loader: async () => ({ models: await getModels() })`.
`chat.$owner.$name.tsx`: `loader: async ({ params }) => ({ model: await getModelDetail({ data: params }) })`.

- [ ] **Step 2: Convert components**

In `chat.lazy.tsx` and `chat.$owner.$name.lazy.tsx`, replace `useModels()`/`useModelDetail()` with `Route.useLoaderData()`. **`useChatStream` stays unchanged** — it is client-only. The `ChatPlayground` component (uses `useChatStream`, `fetch`, `AbortController`) renders fine under SSR as long as the stream is only started on user action (in handlers) — confirm no fetch at render. No change needed to `useChatStream.ts`.

- [ ] **Step 3: Verify & commit**

`build` green; `curl -s http://localhost:3000/chat | grep -c -i playground` ≥ 1.

```bash
git add apps/cockpit-public/src/routes/chat.tsx apps/cockpit-public/src/routes/chat.lazy.tsx apps/cockpit-public/src/routes/chat.\$owner.\$name.tsx apps/cockpit-public/src/routes/chat.\$owner.\$name.lazy.tsx
git commit -m "feat(public): server-load chat routes"
```

### Task 12: `/status` — loader, invalidate polling, hydration fix

**Files:**
- Modify: `apps/cockpit-public/src/routes/status.tsx`, `status.lazy.tsx`

- [ ] **Step 1: Loader**

`status.tsx`: `loader: async () => ({ status: await getStatus(), telemetry: await getTelemetry() })` — add `getTelemetry` to `server-fns.ts` (`serverApi.get<TelemetryResponse>('/api/public/telemetry')`).

- [ ] **Step 2: Convert component + live polling**

In `status.lazy.tsx`: replace `useStatus()`/`useTelemetry()` with `Route.useLoaderData()`. The current `setInterval(() => setTick(t+1), 1500)` drove a react-query refetch indirectly; replace the live refresh with router invalidation:

```tsx
import { useRouter } from '@tanstack/react-router';
// inside the component:
const router = useRouter();
useEffect(() => {
  const i = setInterval(() => router.invalidate(), 15000);
  return () => clearInterval(i);
}, [router]);
```

Use 15 s (the old `useStatus` `refetchInterval`). The 1.5 s `tick` state, if only used for sparkline animation, may stay as local UI state.

- [ ] **Step 3: Fix the P1 hydration bug**

`status.lazy.tsx:197` renders `{new Date().toISOString()...}` directly in JSX → server/client mismatch. Move it to state set in `useEffect`:

```tsx
const [lastPoll, setLastPoll] = useState('');
useEffect(() => { setLastPoll(new Date().toISOString().slice(11, 19)); }, []);
// in JSX: <div>last poll · {lastPoll}Z</div>
```

- [ ] **Step 4: Verify & commit**

`build` green; `curl -s http://localhost:3000/status | grep -c -i uptime` ≥ 1; no hydration warning in the browser console on `/status`.

```bash
git add apps/cockpit-public/src/routes/status.tsx apps/cockpit-public/src/routes/status.lazy.tsx apps/cockpit-public/src/lib/server-fns.ts
git commit -m "feat(public): server-load status, fix hydration"
```

### Task 13: Topstrip telemetry

**Files:**
- Modify: `apps/cockpit-public/src/components/layout/Topstrip.tsx`
- Modify: `apps/cockpit-public/src/routes/__root.tsx`

- [ ] **Step 1: Feed Topstrip from the root loader**

`Topstrip` (rendered in `__root.tsx`, on every page) uses `useTelemetry()`. Add a `loader` to the root route: `loader: async () => ({ telemetry: await getTelemetry() })`, and pass `Route.useLoaderData().telemetry` into `Topstrip` as a prop. Keep a client-side `setInterval` + `router.invalidate()` (5 s) if live refresh is wanted, or accept a static first value — telemetry on the topstrip is decorative; 30 s invalidation is enough.

- [ ] **Step 2: Verify & commit**

`build` green. After this task the build is green and react-query is no longer *needed* by any route (still installed).

```bash
git add apps/cockpit-public/src/components/layout/Topstrip.tsx apps/cockpit-public/src/routes/__root.tsx
git commit -m "feat(public): server-load topstrip telemetry"
```

---

## Phase C — Cleanup & SSR-safety

### Task 14: Remove react-query and dead code

**Files:**
- Delete: `apps/cockpit-public/src/queryClient.ts`, and the 7 migrated hooks (`useModels`, `useModelDetail`, `useEvalScores`, `useMascaradeLoras`, `useProvenance`, `useStatus`, `useTelemetry`).
- Modify: `apps/cockpit-public/package.json`

- [ ] **Step 1: Confirm nothing imports the migrated hooks or react-query**

Run: `cd apps/cockpit-public && grep -rn "react-query\|useModels\|useModelDetail\|useEvalScores\|useMascaradeLoras\|useProvenance\|useStatus\|useTelemetry\|queryClient" src/`
Expected: only `useChatStream` and its own file appear. If a migrated hook is still imported, that route was missed — go back to its Phase B task.

- [ ] **Step 2: Delete dead files & dependency**

```bash
git rm apps/cockpit-public/src/queryClient.ts apps/cockpit-public/src/hooks/useModels.ts apps/cockpit-public/src/hooks/useModelDetail.ts apps/cockpit-public/src/hooks/useEvalScores.ts apps/cockpit-public/src/hooks/useMascaradeLoras.ts apps/cockpit-public/src/hooks/useProvenance.ts apps/cockpit-public/src/hooks/useStatus.ts apps/cockpit-public/src/hooks/useTelemetry.ts
```

Remove `"@tanstack/react-query"` from `package.json` dependencies. Run `pnpm --filter cockpit-public install`.

- [ ] **Step 3: Verify & commit**

`pnpm --filter cockpit-public typecheck` → exit 0. `build` → green.

```bash
git add -A apps/cockpit-public pnpm-lock.yaml
git commit -m "refactor(public): drop react-query, remove dead hooks"
```

### Task 15: SSR-safety pass

**Files:**
- Modify: `apps/cockpit-public/src/components/layout/Footer.tsx`
- Modify: `apps/cockpit-public/src/components/dev/TweaksPanel.tsx`

- [ ] **Step 1: Footer build date (P3)**

`Footer.tsx:3` has `const BUILD_DATE = new Date().toISOString().slice(0, 10);` at module scope → server/client mismatch risk. Replace with a build-time constant injected by Vite. In `vite.config.ts` add `define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)) }`, declare `declare const __BUILD_DATE__: string;` in a `src/vite-env.d.ts`, and use `__BUILD_DATE__` in `Footer.tsx`.

- [ ] **Step 2: TweaksPanel guard (P2)**

`TweaksPanel.tsx` `readInitialTweaks()` runs in a `useState` initializer and touches `document`/`getComputedStyle`. It is dev-only (tree-shaken in prod) but breaks dev SSR. Guard the initializer:

```ts
function readInitialTweaks(): Tweaks {
  if (typeof document === 'undefined') {
    return { theme: 'paper', density: 'comfortable', accent: '#1c3fbb', showTopstrip: true };
  }
  // ...existing body
}
```

- [ ] **Step 3: Full SSR-safety grep**

Run: `cd apps/cockpit-public && grep -rn "window\.\|document\.\|localStorage\|sessionStorage\|navigator\.\|matchMedia\|getComputedStyle" src/ | grep -v node_modules`
For each hit, confirm it is inside a `useEffect`, an event handler, or guarded by `typeof window !== 'undefined'`. Fix any module-scope or render-path access.

- [ ] **Step 4: Verify & commit**

`build` green. `pnpm --filter cockpit-public start` and check the server console shows no SSR exceptions on any route.

```bash
git add -A apps/cockpit-public
git commit -m "fix(public): make components ssr-safe"
```

---

## Phase D — Deployment

### Task 16: Dockerfile — Node runtime for `public`

**Files:**
- Modify: `Dockerfile` (repo root)

- [ ] **Step 1: Replace the `public` runtime target**

The current `public` target is `FROM nginx:1.27-alpine` copying `dist/`. Replace it with a Node runtime serving the Nitro output. Read the current `Dockerfile`; change the `public-build` step's output and the `public` target to:

```dockerfile
# --- cockpit-public runtime (SSR Node server) ---
FROM node:20-bookworm-slim AS public
WORKDIR /app
COPY --from=public-build /repo/apps/cockpit-public/.output ./.output
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
```

`public-build` keeps `RUN pnpm --filter cockpit-public build` (now a Start build producing `.output/`). Verify the Nitro output path (`.output/server/index.mjs`) against the build output from Task 6.

- [ ] **Step 2: Commit**

```bash
git add Dockerfile
git commit -m "build: cockpit-public runtime as node ssr server"
```

### Task 17: Compose + Traefik — `public`/`preview` on port 3000

**Files:**
- Modify: `deploy/docker-compose.yml`
- Modify: `deploy/traefik-dynamic/ailiance-demo.yml`

- [ ] **Step 1: Compose**

In `deploy/docker-compose.yml`, the `public` and `preview` services: keep `build.target: public`. The `VITE_API_BASE_URL` build arg stays `""` (the browser still uses `/api`). Add a runtime env for the server-side internal API URL:

```yaml
  public:
    # ...existing
    environment:
      INTERNAL_API_URL: http://api:9100
    networks: [traefik, default]   # add `default` so it can reach `api`
```

Apply the same `environment` + `networks` to `preview`. The `api` service is on the `default` network — `public` must join `default` to resolve `http://api:9100`.

- [ ] **Step 2: Traefik backend port**

In `deploy/traefik-dynamic/ailiance-demo.yml`, the `kiki-public` service URL is `http://ailiance-demo-public-1:80`. Change to `http://ailiance-demo-public-1:3000`. If a `preview` router/service exists there, update it likewise.

- [ ] **Step 3: Commit**

```bash
git add deploy/docker-compose.yml deploy/traefik-dynamic/ailiance-demo.yml
git commit -m "deploy: route cockpit-public to node server port"
```

---

## Phase E — Verification & ship

### Task 18: Full verification

**Files:** none (verification).

- [ ] **Step 1: Build, typecheck, lint**

`pnpm --filter cockpit-public build` → green. `pnpm --filter cockpit-public typecheck` → exit 0. `pnpm lint` → exit 0 (fix any new biome errors in touched files).

- [ ] **Step 2: SSR proof (the central criterion)**

`pnpm --filter cockpit-public start` (after a build; needs the dev API on 9100, or set `INTERNAL_API_URL`). For each route `/`, `/about`, `/bench`, `/catalog`, `/chat`, `/models`, `/status`, `/transparency` and one real `/models/$owner/$name`: `curl -s http://localhost:3000<route>` and confirm the `<h1>`/body text is in the raw HTML and there is no empty `<div id="root">`.

- [ ] **Step 3: Hydration & interaction (Playwright)**

With the server running, use Playwright: navigate each route, assert no console hydration-mismatch errors, the nav works, the chat playground streams on send, `/status` updates, and the layout is intact at 768/1024/1280 px (responsive parity).

- [ ] **Step 4: Fix and re-verify** any failure before proceeding; commit fixes with a `fix(public):` message.

### Task 19: Critic review, deploy, PR

- [ ] **Step 1: Critic review**

Dispatch a `critic` agent with the full branch diff (`git diff main...HEAD`), the spec, and the verification evidence — per the user rule `feedback_critic_before_ship`. Address CRITICAL/MAJOR findings.

- [ ] **Step 2: Deploy to preview**

On electron-server: update `/opt/ailiance-cockpit` to the branch, `cd deploy && docker compose build preview && docker compose up -d preview`. Verify `https://preview.ailiance.fr` SSRs correctly (`curl` for content; check a route in a browser).

- [ ] **Step 3: PR**

Push the branch; open a PR to `ailiance/ailiance-demo` describing the SSR migration, the deploy change (nginx→Node), and that Project 2 (SEO layer) follows. Note that prod cutover (`docker compose build public && up -d public`) happens after merge + preview validation.

---

## Self-review notes

- Spec coverage: in-place migration (Tasks 2–6), data layer → loaders (7–13), nginx→Node deploy (16–17), SSR-safety (15), parity verification (18) — all covered.
- The transitional react-query window (Phases A–B) is deliberate and documented; Task 14 removes it.
- `useChatStream` is explicitly kept client-side (Task 11).
- Framework-boilerplate tasks (2–6) carry an explicit "verify against installed version" instruction — TanStack Start's exact entry API is version-sensitive and must be confirmed at execution time, not guessed.

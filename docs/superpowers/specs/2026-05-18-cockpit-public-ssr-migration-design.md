# Migration SSR de cockpit-public (TanStack Start)

- **Date** : 2026-05-18
- **App concernée** : `apps/cockpit-public` (site public `ailiance.fr`)
- **Statut** : design approuvé, prêt pour plan d'implémentation
- **Position** : Projet 1 d'un découpage en 2. Projet 2 = couche
  SEO/AEO (meta, Open Graph, JSON-LD, `robots.txt`, `sitemap.xml`,
  `llms.txt`, canonical, favicon) — fera l'objet d'un spec distinct
  et dépend de ce Projet 1.

## Contexte

Un audit SEO du site public `ailiance.fr` (app `cockpit-public`) a
établi que c'est une **SPA en rendu client (CSR) pur** : le HTML
servi ne contient qu'un `<div id="root">` vide, le contenu
n'apparaît qu'après exécution du JavaScript.

Conséquence : les crawlers IA (GPTBot, ClaudeBot, PerplexityBot,
etc.) — qui n'exécutent pas le JavaScript — ne voient aucun contenu.
Le site est pratiquement invisible pour ChatGPT, Claude et Perplexity,
et indexé avec retard et risques par Google.

L'objectif demandé est une « passe SEO » incluant la découvrabilité
par les moteurs IA. La condition structurante est de servir un HTML
qui contient réellement le contenu : c'est l'objet de ce Projet 1.

## Objectif & périmètre

**Objectif** : migrer `apps/cockpit-public` d'une SPA Vite
(`@tanstack/react-router`) vers **TanStack Start** (SSR), de sorte que
chaque route soit rendue côté serveur et que le HASH HTML livré
contienne le contenu des pages.

**Dans le périmètre** :
- Migration SSR en place de `cockpit-public`.
- Couche données refondue en route loaders + `createServerFn`
  (abandon de `@tanstack/react-query`).
- Nouveau déploiement : conteneur Node (au lieu de nginx statique).
- Passe SSR-safety du code.
- Parité UX et visuelle stricte avec le site actuel.

**Hors périmètre** (→ Projet 2, spec distinct) :
- `<head>` par route, `<title>`/`meta description` spécifiques,
  Open Graph, Twitter cards.
- JSON-LD / schema.org.
- `robots.txt`, `sitemap.xml`, `llms.txt`, favicon.
- URLs canoniques, redirection `www`→apex.
- Projet 1 conserve tel quel le `<title>` global unique actuel.

**Hors périmètre** (définitif) :
- `apps/cockpit-admin` — outil interne, reste une SPA Vite.
- `apps/api` — non modifié.

## Décisions actées (brainstorming)

- **Ampleur** : SSR complet (et non SSG partiel).
- **Découpage** : 2 projets ; ce spec couvre le Projet 1.
- **Couche données** : migration vers les loaders TanStack Start +
  `createServerFn` (abandon de react-query).
- **Stratégie de migration** : conversion en place de
  `apps/cockpit-public` (et non un scaffold parallèle).

## Architecture cible

TanStack Start = TanStack Router + une couche serveur. Les fichiers
de routes, les composants et `styles.css` restent ; on ajoute le
serveur et on bascule le data-loading.

### Fichiers de configuration

- **`vite.config.ts`** : retirer `TanStackRouterVite` ; ajouter
  `tanstackStart()` (depuis `@tanstack/react-start/plugin/vite`) et
  `nitro()` (depuis `nitro/vite`). Conserver `viteReact()`. Nitro est
  le moteur serveur (build SSR + cible de déploiement Node).
- **`package.json`** : ajouter `@tanstack/react-start` et `nitro` ;
  retirer `@tanstack/react-query`. Adapter les scripts `dev`/`build`
  au build Start.
- **`tsconfig`** : ajustements éventuels (résolution de chemins,
  types Start).

### Entrées & document

- `src/main.tsx` (`createRoot().render(...)`) et `index.html`
  disparaissent : Start gère les entrées serveur/client.
- Le shell HTML (`<html><head><body>`) est porté par `__root.tsx`.
  Le `<head>` actuel (un seul `<title>`, `lang="fr"`, charset,
  viewport) y est reproduit à l'identique — la granularité par route
  est explicitement laissée au Projet 2.

### Routes

- `src/routes/*` conservés. 8 pages publiques + 2 routes dynamiques
  (`models/$owner/$name`, `chat/$owner/$name`).
- Chaque route ayant besoin de données reçoit un `loader` exécuté
  côté serveur au premier rendu.
- Le code-splitting `.lazy.tsx` est revu selon le mécanisme Start
  (le split reste possible mais sa déclaration peut changer).
- `notFoundComponent` pour les 404 ; `errorComponent` par route pour
  les erreurs de `loader`.

## Couche données

Les 8 hooks `src/hooks/use*.ts` (`useModels`, `useModelDetail`,
`useEvalScores`, `useMascaradeLoras`, `useProvenance`, `useStatus`,
`useTelemetry`, `useChatStream`) sont traités ainsi :

- **7 hooks de chargement** (tous sauf `useChatStream`) → supprimés,
  remplacés par des `loader`s de route + des `createServerFn` qui
  encapsulent les appels API. Le composant consomme
  `Route.useLoaderData()`.
- **`useChatStream`** → **reste client-side**. Le streaming SSE vers
  la gateway est une interaction temps réel, pas un chargement de
  page ; `createServerFn` n'est pas adapté. Le hook reste un `fetch`
  client vers `/api`.

### Adressage de l'API

- **Côté serveur** (`loader`/`createServerFn`) : appel via l'URL
  **interne** du réseau Docker (ex. `http://api:9100`), fournie par
  une variable d'environnement (ex. `INTERNAL_API_URL`).
- **Côté client** (`useChatStream`) : appel via le chemin public
  relatif `/api`, comme aujourd'hui.

### Polling live de `/status`

La page `/status` se rafraîchit toutes les 1,5 s (workers, telemetry).
- Le `loader` fournit le premier paint SSR.
- Côté client, un `setInterval` déclenche `router.invalidate()` pour
  ré-exécuter le `loader` et rafraîchir l'affichage.

## Déploiement

Le conteneur `ailiance-demo-public` passe de **nginx statique** à un
**serveur Node persistant**.

- **Dockerfile** (`apps/cockpit-public`) : étape de build Start →
  Nitro produit `.output/` ; l'image finale lance
  `node .output/server/index.mjs` (preset Nitro `node-server`). La
  génération `gen:api-types` reste dans le build.
- **`deploy/docker-compose.yml`** : service `public` — `build` et
  `command`/`entrypoint` adaptés. Le `deploy/nginx/spa.conf` n'est
  plus utilisé par le service `public` (Nitro sert les assets
  statiques et le SSR). Le service `preview` reçoit le même
  traitement.
- **Traefik** : la route `ailiance.fr` pointe vers le port du serveur
  Node (Nitro, `:3000` par défaut) au lieu du `:80` nginx.
- **Cutover** : valider d'abord sur le slot `preview`, puis basculer
  la prod.

## SSR-safety & gestion d'erreur

- **Passe SSR-safety** : auditer les composants pour tout accès à
  `window`, `document`, `localStorage`, `matchMedia` au niveau module
  ou pendant le render — à déplacer en `useEffect` / garde
  `typeof window`. `TweaksPanel` (dev-only, accède à `document`)
  reste chargé en lazy/client. Le `matchMedia` de `__root.tsx` est
  déjà en `useEffect` — conforme.
- **Erreur API au rendu SSR** : si l'API est injoignable quand un
  `loader` s'exécute, il lève une erreur ; un `errorComponent` de
  route affiche un état dégradé lisible (jamais de page blanche).
- **Hydratation** : aucun écart de balisage serveur/client toléré
  (vérifié en console).

## Risques & mitigations

- **Maturité de TanStack Start** : framework plus jeune que les
  alternatives. Mitigation : conversion en place sur une branche
  dédiée, vérification exhaustive avant tout cutover.
- **Changement de déploiement (nginx → Node)** : risque de cutover
  en production. Mitigation : validation sur le slot `preview` avant
  bascule prod ; rollback = recharger l'image nginx précédente.
- **Réécriture de la couche données** : 7 hooks migrés en loaders —
  surface large. Mitigation : parité testée route par route, l'API
  et ses contrats (`gen:api-types`) sont inchangés.
- **Code SSR-unsafe non détecté** : un accès `window` manqué casse le
  rendu serveur. Mitigation : passe SSR-safety explicite + le build
  Start échoue tôt sur ce type de problème.
- **Régression du travail responsive** : `styles.css` ne doit pas
  bouger ; parité visuelle vérifiée à 768/1024/1280 px.

## Validation

- Build Start vert ; le serveur Node démarre.
- **Preuve SSR (critère central, binaire)** : `curl` sur les 8 pages
  publiques et les 2 routes dynamiques → le HTML brut renvoyé
  contient le contenu (titre `<h1>`, texte) et non un
  `<div id="root">` vide.
- Aucune erreur d'hydratation en console sur les 10 routes.
- Playwright : nav, chat streaming, polling `/status` fonctionnels ;
  parité visuelle à 768/1024/1280 px avec le site actuel.
- Type-check et lint verts.
- Revue par un agent `critic` avant le commit de PR (règle
  utilisateur `feedback_critic_before_ship`).

## Livraison

- Branche `feat/cockpit-public-ssr-migration` depuis `main`.
- Commits conformes aux hooks du repo (sujet ≤ 50 car., corps
  ≤ 72 car., pas d'attribution AI, pas de scope avec underscore).
- Pull request vers `ailiance/ailiance-demo`.
- Build + déploiement Docker sur electron-server : d'abord le slot
  `preview`, puis cutover prod après validation.

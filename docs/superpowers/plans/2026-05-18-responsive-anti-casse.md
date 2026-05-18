# Responsive « anti-casse » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éliminer toute casse de mise en page du site public `ailiance.fr` (app `cockpit-public`) dans la plage 768–1280 px, sans refonte mobile-first.

**Architecture:** Approche CSS étendue. Un seul breakpoint `@media (max-width: 1024px)` remplace les deux existants. Les grilles `style={{}}` inline sont migrées en classes CSS nommées pour entrer sous contrôle du `@media`. Les tableaux de données denses (`.board-row`, `.worker-row`) reçoivent un conteneur `overflow-x: auto`. Le bug structurel `.worker-row` (grille 6 colonnes / 9 enfants) est corrigé au passage.

**Tech Stack:** React 19, TanStack Router, Vite, Tailwind CSS v3.4 (non utilisé ici), CSS nommé dans `src/styles.css`. Monorepo pnpm.

**Spec de référence:** `docs/superpowers/specs/2026-05-18-responsive-anti-casse-design.md`

---

## Structure de fichiers

Tout le travail est dans `apps/cockpit-public/` :

| Fichier | Rôle | Tâches |
|---------|------|--------|
| `src/styles.css` | Toutes les règles CSS du site (1550 lignes) | 1, 2, 3, 4 |
| `src/routes/index.tsx` | Page d'accueil — bande CTA | 5 |
| `src/routes/about.lazy.tsx` | Page À propos — grille BACKENDS | 5 |
| `src/routes/status.lazy.tsx` | Page Status — SummaryStat + bloc bas | 5 |

Aucun fichier créé. `Header.tsx` et `models.index.lazy.tsx` ne sont **pas** modifiés : leurs corrections sont entièrement CSS.

**Préalable :** la branche `feat/responsive-anti-casse` existe déjà (créée au brainstorming, contient le commit de la spec). Tout le travail s'y ajoute. Repo local : `/Users/electron/ailiance-demo`.

---

### Task 1: Header & topstrip — bandes du haut

Deux bandes en haut de page cassent sous 1280 px. (a) La nav du header (5 liens + drapeau, ~626 px de contenu) est en `display:flex` sans `flex-wrap`, dans un `.masthead-inner` à hauteur fixe : sous ~970 px de viewport elle déborde horizontalement. Correctif : autoriser `.masthead-inner` à passer sur 2 lignes (marque ligne 1, nav ligne 2) — `flex-wrap` n'enroule que quand le contenu déborde, donc aucun effet sur desktop large. (b) Le `.topstrip-inner` est en `overflow: hidden` : ses dernières cellules de télémétrie sont coupées et invisibles sous ~900 px. Correctif : `overflow-x: auto` pour les rendre scrollables au lieu de masquées.

**Files:**
- Modify: `apps/cockpit-public/src/styles.css` (règles `.masthead-inner` et `.topstrip-inner`)

- [ ] **Step 1: Modifier la règle `.masthead-inner`**

Edit — `old_string` :

```css
.masthead-inner {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 32px;
  height: 64px;
}
```

`new_string` :

```css
.masthead-inner {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 32px;
  min-height: 64px;
}
```

- [ ] **Step 2: Modifier la règle `.topstrip-inner`**

Edit — `old_string` :

```css
.topstrip-inner {
  display: flex;
  gap: 0;
  height: 30px;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
}
```

`new_string` :

```css
.topstrip-inner {
  display: flex;
  gap: 0;
  height: 30px;
  align-items: center;
  overflow-x: auto;
  white-space: nowrap;
}
```

- [ ] **Step 3: Vérifier que le type-check passe toujours**

Run : `pnpm --filter cockpit-public typecheck`
Expected : exit 0, aucune erreur (changement CSS pur, ne peut pas casser le TS — sert de garde-fou).

- [ ] **Step 4: Commit**

```bash
cd /Users/electron/ailiance-demo
git add apps/cockpit-public/src/styles.css
git commit -m "fix(public): wrap nav, scroll topstrip on tablet"
```

---

### Task 2: Tableaux denses — conteneurs scrollables + correction grille worker-row

Deux tableaux de données denses débordent sous 1280 px : `.board-row` (Status, 7 colonnes) et `.worker-row` (Modèles). De plus, `.worker-row` déclare une grille à **6 colonnes** (`14px 1.6fr 1fr 1fr 1fr 60px`) alors que le JSX rend **9 enfants** (point, identité, 7 blocs de métriques) — bug déjà visible en desktop. La classe `.worker-row-rich` (appliquée en plus de `.worker-row` dans le JSX) n'a aucune règle CSS : on l'utilise pour porter la grille correcte.

Stratégie : grille 9 colonnes sur `.worker-row-rich`, `min-width` sur les lignes, `overflow-x: auto` sur les conteneurs `.fleet` et `.fleet-board`. Ces règles sont inconditionnelles : sans effet sur desktop (le contenu tient dans `.wrap`), elles déclenchent le scroll quand la place manque.

**Files:**
- Modify: `apps/cockpit-public/src/styles.css` (règles `.fleet`, `.fleet-head`, `.worker-row` family, `.fleet-board`, `.board-row`)

- [ ] **Step 1: Ajouter `overflow-x: auto` à `.fleet`**

Edit — `old_string` :

```css
.fleet {
  border: 1px solid var(--ink);
  background: var(--paper-2);
  padding: 0;
  position: relative;
}
```

`new_string` :

```css
.fleet {
  border: 1px solid var(--ink);
  background: var(--paper-2);
  padding: 0;
  position: relative;
  overflow-x: auto;
}
```

- [ ] **Step 2: Ajouter `min-width` à `.fleet-head`**

Edit — `old_string` :

```css
.fleet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--ink);
  background: var(--ink);
  color: var(--paper);
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
```

`new_string` : identique, avec `  min-width: 900px;` ajouté juste avant l'accolade fermante :

```css
.fleet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--ink);
  background: var(--ink);
  color: var(--paper);
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  min-width: 900px;
}
```

- [ ] **Step 3: Définir la règle `.worker-row-rich` (corrige le bug 6 colonnes / 9 enfants)**

Le JSX `models.index.lazy.tsx:303` rend 9 enfants dans cet ordre : point d'état, bloc identité, latence, GPU, VRAM, temp, tokens/j, kWh/j, état. La grille doit donc avoir 9 colonnes. `.worker-row-rich` étant déclarée après `.worker-row` et de même spécificité, sa `grid-template-columns` l'emporte.

Edit — `old_string` (fin de la famille `.worker-row`) :

```css
.worker-row .spark i {
  width: 3px;
  background: var(--ink-3);
  display: block;
}
```

`new_string` :

```css
.worker-row .spark i {
  width: 3px;
  background: var(--ink-3);
  display: block;
}
.worker-row-rich {
  grid-template-columns: 14px 1.8fr repeat(6, 1fr) 72px;
  min-width: 900px;
}
```

- [ ] **Step 4: Ajouter `overflow-x: auto` à `.fleet-board`**

Edit — `old_string` :

```css
.fleet-board {
  border-top: 1px solid var(--ink);
  border-left: 1px solid var(--rule);
}
```

`new_string` :

```css
.fleet-board {
  border-top: 1px solid var(--ink);
  border-left: 1px solid var(--rule);
  overflow-x: auto;
}
```

- [ ] **Step 5: Ajouter `min-width` à `.board-row`**

Edit — `old_string` :

```css
.board-row {
  display: grid;
  grid-template-columns: 40px 1fr 200px 120px 120px 100px 80px;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-right: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  background: var(--paper);
  font-family: var(--mono);
  font-size: 12px;
}
```

`new_string` : identique, avec `  min-width: 860px;` ajouté juste avant l'accolade fermante :

```css
.board-row {
  display: grid;
  grid-template-columns: 40px 1fr 200px 120px 120px 100px 80px;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-right: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  background: var(--paper);
  font-family: var(--mono);
  font-size: 12px;
  min-width: 860px;
}
```

- [ ] **Step 6: Vérifier le type-check**

Run : `pnpm --filter cockpit-public typecheck`
Expected : exit 0.

- [ ] **Step 7: Commit**

```bash
cd /Users/electron/ailiance-demo
git add apps/cockpit-public/src/styles.css
git commit -F- <<'EOF'
fix(public): make fleet tables scroll on tablet

Wrap .fleet and .fleet-board content in overflow-x containers with
a min-width on rows so the 7- and 9-column data tables scroll
horizontally instead of overflowing the page below 1280px.

Also defines .worker-row-rich with a 9-column grid: the JSX renders
9 children but .worker-row only declared 6 columns — a layout bug
already visible on desktop.
EOF
```

---

### Task 3: Classes nommées pour les grilles inline

Quatre grilles sont écrites en `style={{gridTemplateColumns}}` inline dans le JSX — elles échappent donc à tout `@media`. On définit d'abord les classes CSS équivalentes (aucun élément ne les porte encore : insertion inerte). Le JSX basculera dessus en Task 5.

Ces classes sont placées juste avant le bloc `@media (max-width: 1100px)` (fin de `styles.css`).

**Files:**
- Modify: `apps/cockpit-public/src/styles.css` (insertion avant le bloc `@media`)

- [ ] **Step 1: Insérer les 4 classes avant le bloc `@media`**

Edit — `old_string` :

```css
@media (max-width: 1100px) {
```

`new_string` :

```css
/* ===== responsive — grids migrated from inline styles ===== */
.cta-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: end;
}
.backends-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
  margin: 24px 0;
  border: 1px solid var(--rule);
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin-top: 40px;
  border: 1px solid var(--ink);
}
.status-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin-top: 24px;
  border: 1px solid var(--rule);
}

@media (max-width: 1100px) {
```

- [ ] **Step 2: Vérifier le type-check**

Run : `pnpm --filter cockpit-public typecheck`
Expected : exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/electron/ailiance-demo
git add apps/cockpit-public/src/styles.css
git commit -F- <<'EOF'
style(public): add named classes for inline grids

Adds .cta-split, .backends-grid, .summary-grid and .status-split,
the CSS equivalents of four inline grid styles. Not yet applied to
any element — the JSX switches over in a later commit.
EOF
```

---

### Task 4: Breakpoint unifié à 1024 px

Le site a deux `@media` incohérents : `max-width: 900px` (pour `.router-branch` seul) et `max-width: 1100px` (7 classes). On les remplace par un bloc unique `max-width: 1024px` qui replie aussi `.dl-grid`, `.router-branch` et les 4 nouvelles classes. `.summary-grid` se replie en 2 colonnes (pas 1) pour garder ses chiffres serif 48 px lisibles.

**Files:**
- Modify: `apps/cockpit-public/src/styles.css` (suppression du bloc `@media:900`, remplacement du bloc `@media:1100`)

- [ ] **Step 1: Supprimer le bloc `@media (max-width: 900px)`**

Ce bloc devient redondant (`.router-branch` est repris dans le bloc unifié).

Edit — `old_string` :

```css
@media (max-width: 900px) {
  .router-branch {
    grid-template-columns: 1fr;
  }
}
```

`new_string` : (chaîne vide — supprimer le bloc)

Si l'outil d'édition refuse une chaîne vide, inclure dans `old_string` la ligne vide qui suit le bloc et la supprimer aussi, ou remplacer le bloc par un unique caractère de fin de ligne. Le résultat attendu : le bloc `@media (max-width: 900px)` n'existe plus dans le fichier.

- [ ] **Step 2: Remplacer le bloc `@media (max-width: 1100px)`**

Edit — `old_string` :

```css
@media (max-width: 1100px) {
  .hero,
  .block-head,
  .chat-shell,
  .detail-grid,
  .pillars,
  .models-grid,
  .foot-grid {
    grid-template-columns: 1fr !important;
  }
  .chat-left,
  .chat-right {
    display: none;
  }
}
```

`new_string` :

```css
/* ===== responsive — single anti-casse breakpoint ===== */
@media (max-width: 1024px) {
  .hero,
  .block-head,
  .chat-shell,
  .detail-grid,
  .pillars,
  .models-grid,
  .foot-grid,
  .router-branch,
  .dl-grid,
  .cta-split,
  .backends-grid,
  .status-split {
    grid-template-columns: 1fr !important;
  }
  .summary-grid {
    grid-template-columns: 1fr 1fr !important;
  }
  .chat-left,
  .chat-right {
    display: none;
  }
}
```

- [ ] **Step 3: Vérifier qu'il ne reste qu'un seul `@media`**

Run : `grep -n "@media" apps/cockpit-public/src/styles.css`
Expected : une seule ligne, `@media (max-width: 1024px) {`.

- [ ] **Step 4: Vérifier le type-check**

Run : `pnpm --filter cockpit-public typecheck`
Expected : exit 0.

- [ ] **Step 5: Commit**

```bash
cd /Users/electron/ailiance-demo
git add apps/cockpit-public/src/styles.css
git commit -F- <<'EOF'
fix(public): unify responsive breakpoint at 1024px

Replaces the inconsistent 900px and 1100px media queries with a
single max-width:1024px block. It now also folds .dl-grid,
.router-branch and the four migrated grid classes; .summary-grid
folds to two columns to keep its 48px serif figures readable.
EOF
```

---

### Task 5: Migrer les grilles inline vers les classes nommées

On remplace les 4 `style={{gridTemplateColumns...}}` inline par les `className` définies en Task 3. À la fin de cette tâche, le repli responsive est actif sur ces 4 grilles.

**Files:**
- Modify: `apps/cockpit-public/src/routes/index.tsx` (bande CTA)
- Modify: `apps/cockpit-public/src/routes/about.lazy.tsx` (grille BACKENDS)
- Modify: `apps/cockpit-public/src/routes/status.lazy.tsx` (SummaryStat + bloc bas)

- [ ] **Step 1: `index.tsx` — bande CTA**

Edit — `old_string` :

```tsx
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 48,
              alignItems: 'end',
            }}
          >
```

`new_string` :

```tsx
          <div className="cta-split">
```

- [ ] **Step 2: `about.lazy.tsx` — grille BACKENDS**

Edit — `old_string` :

```tsx
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 0,
              margin: '24px 0',
              border: '1px solid var(--rule)',
            }}
          >
```

`new_string` :

```tsx
          <div className="backends-grid">
```

- [ ] **Step 3: `status.lazy.tsx` — conteneur des SummaryStat**

Edit — `old_string` :

```tsx
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            marginTop: 40,
            border: '1px solid var(--ink)',
          }}
        >
```

`new_string` :

```tsx
        <div className="summary-grid">
```

- [ ] **Step 4: `status.lazy.tsx` — bloc bas (probe sequence)**

Edit — `old_string` :

```tsx
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0,
            marginTop: 24,
            border: '1px solid var(--rule)',
          }}
        >
```

`new_string` :

```tsx
        <div className="status-split">
```

- [ ] **Step 5: Vérifier le type-check**

Run : `pnpm --filter cockpit-public typecheck`
Expected : exit 0. (Si une erreur « unused import » apparaît, aucune n'est attendue ici — les `style` retirés n'utilisaient pas d'import dédié.)

- [ ] **Step 6: Commit**

```bash
cd /Users/electron/ailiance-demo
git add apps/cockpit-public/src/routes/index.tsx apps/cockpit-public/src/routes/about.lazy.tsx apps/cockpit-public/src/routes/status.lazy.tsx
git commit -m "refactor(public): use grid classes over inline css"
```

---

### Task 6: Vérification build, type-check et lint

- [ ] **Step 1: Type-check complet**

Run : `pnpm --filter cockpit-public typecheck`
Expected : exit 0.

- [ ] **Step 2: Build de production**

Run : `pnpm --filter cockpit-public build`
Expected : exit 0 ; le build génère `apps/cockpit-public/dist/` sans erreur (`tsr generate` + `tsc --noEmit` + `vite build`).

- [ ] **Step 3: Lint**

Run : `pnpm biome check apps/cockpit-public/src`
Expected : exit 0. Si Biome signale du formatage sur les lignes modifiées, lancer `pnpm biome check --write apps/cockpit-public/src`, revérifier, puis :

```bash
cd /Users/electron/ailiance-demo
git add -A apps/cockpit-public/src
git commit -m "style(public): apply biome formatting"
```

(Ne committer que si Biome a effectivement modifié des fichiers.)

---

### Task 7: Vérification visuelle (Playwright, 768 / 1024 / 1280 px)

Vérifie l'objectif « anti-casse » : aucun débordement horizontal sur les 8 pages aux 3 largeurs. Le backend API peut être indisponible — la structure des grilles reste vérifiable via les états de chargement.

**Files:** aucun (vérification).

- [ ] **Step 1: Lancer le serveur de dev**

Run (en arrière-plan) : `pnpm --filter cockpit-public dev`
Le serveur Vite démarre (port par défaut `5173`). Noter l'URL exacte affichée.

- [ ] **Step 2: Tester chaque page à chaque largeur**

Pour chaque largeur ∈ {768, 1024, 1280} et chaque route ∈
`/`, `/about`, `/bench`, `/catalog`, `/chat`, `/models`, `/status`, `/transparency` :

1. `browser_resize` à `{width, height: 900}`.
2. `browser_navigate` vers `http://localhost:5173<route>`.
3. `browser_evaluate` :

```js
() => document.documentElement.scrollWidth - document.documentElement.clientWidth
```

Expected : valeur **≤ 0** (aucun débordement horizontal de page). Une valeur > 0 sur une route signale une casse à corriger.

4. `browser_take_screenshot` pour archive visuelle.

Cas particulier attendu et **acceptable** : sur `/status` et `/models`, le débordement horizontal doit être **contenu dans le conteneur scrollable** (`.fleet`, `.fleet-board`) et non au niveau de la page — donc la mesure page-level reste ≤ 0. Si elle est > 0, le conteneur scroll n'est pas pris : revoir Task 2.

- [ ] **Step 3: Vérifier le header enroulé**

À 768 px sur `/`, confirmer sur le screenshot que la nav du header est passée sous la marque (2 lignes) sans débordement ni chevauchement.

- [ ] **Step 4: Vérifier la non-régression desktop**

À 1280 px, confirmer que les 8 pages sont visuellement identiques à `main` (le travail ne doit rien changer au-dessus de 1024 px, sauf la ligne `.worker-row` de `/models` — qui doit désormais afficher ses 9 colonnes correctement alignées).

- [ ] **Step 5: Corriger et committer si une casse est trouvée**

Si une route déborde, corriger la cause (largeur fixe ou grille manquante non couverte), puis :

```bash
cd /Users/electron/ailiance-demo
git add -A apps/cockpit-public/src
git commit -m "fix(public): <description courte du correctif>"
```

- [ ] **Step 6: Arrêter le serveur de dev**

Arrêter le process Vite lancé au Step 1.

---

### Task 8: Revue critic, push et pull request

- [ ] **Step 1: Revue par l'agent critic**

Dispatcher un agent `critic` (contexte neuf) avec : le diff complet de la branche (`git diff main...feat/responsive-anti-casse`), la spec `docs/superpowers/specs/2026-05-18-responsive-anti-casse-design.md`, et les screenshots de Task 7. Conformément à la règle utilisateur `feedback_critic_before_ship` (revue obligatoire avant tout commit de ship).

Traiter les retours CRITIQUE et MAJEUR avant de continuer ; committer les correctifs éventuels.

- [ ] **Step 2: Push de la branche**

```bash
cd /Users/electron/ailiance-demo
git push -u origin feat/responsive-anti-casse
```

- [ ] **Step 3: Ouvrir la pull request**

```bash
cd /Users/electron/ailiance-demo
gh pr create --repo ailiance/ailiance-demo --base main \
  --title "Responsive anti-casse 768-1280px (cockpit-public)" \
  --body "$(cat <<'EOF'
## Objectif

Élimine la casse de mise en page du site public dans la plage
768–1280px (tablettes, petits laptops). Pas de refonte mobile-first.

## Changements

- Breakpoint unique `@media (max-width: 1024px)` (remplace 900px + 1100px).
- 4 grilles inline migrées en classes CSS nommées.
- Nav du header : `flex-wrap` (s'enroule au lieu de déborder).
- `.board-row` / `.worker-row` : conteneurs `overflow-x: auto`.
- Bug corrigé : `.worker-row` déclarait 6 colonnes pour 9 enfants
  rendus — affichage desktop également amélioré.

## Vérification

- `typecheck`, `build`, `biome check` : OK.
- Playwright : aucun débordement horizontal de page sur les 8 routes
  à 768 / 1024 / 1280px.
- Revue agent critic.

## Hors périmètre

Téléphone < 768px, menu hamburger, refonte mobile-first. Le
redéploiement Docker Compose sur electron-server (rebuild de l'image
`cockpit-public`) est à faire après merge.

Spec : `docs/superpowers/specs/2026-05-18-responsive-anti-casse-design.md`
EOF
)"
```

Expected : la PR est créée ; en relayer l'URL à l'utilisateur.

---

## Notes d'implémentation

- **Pas de menu hamburger** : choix délibéré (outil desktop). La nav s'enroule simplement.
- **Règles `overflow-x` / `min-width` inconditionnelles** (Task 2) : sans effet au-dessus de ~1024 px car le contenu tient dans `.wrap` (max 1320 px). Inutile de les mettre dans le `@media`.
- **Légende sous `.fleet`** : la phrase explicative en bas du bloc `.fleet` (Modèles) n'a pas de `min-width` ; lors d'un scroll horizontal elle reste à largeur de conteneur. Cosmétique mineur, accepté.
- **Hooks de commit** : sujet ≤ 50 caractères, corps ≤ 72, pas d'attribution AI, pas de `--no-verify`, pas d'underscore dans le scope. Les messages fournis respectent ces contraintes.

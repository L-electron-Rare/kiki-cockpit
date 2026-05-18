# Responsive « anti-casse » — site public ailiance.fr

- **Date** : 2026-05-18
- **App concernée** : `apps/cockpit-public` (site public `ailiance.fr`)
- **Stack** : React 19 + TanStack Router + Vite + Tailwind CSS v3.4
- **Statut** : design approuvé, prêt pour plan d'implémentation

## Contexte

Le site public `ailiance.fr` (app `cockpit-public`) a été conçu pour
desktop uniquement. Constat objectif :

- **0** classe utilitaire responsive Tailwind (`sm:`/`md:`/`lg:`/`xl:`)
  dans tout le code source.
- **2** seules règles `@media` dans `src/styles.css` (1550 lignes) :
  `@media (max-width:900px)` pour `.router-branch` et
  `@media (max-width:1100px)` pour 7 classes nommées.
- Aucune variable CSS de breakpoint, aucune container query, aucun
  helper responsive.

## Objectif & périmètre

**Objectif « anti-casse »** : le site reste un outil desktop. Le but
n'est pas une refonte mobile-first mais d'éliminer toute casse de mise
en page (débordement horizontal, contenu illisible ou coupé) dans la
plage **768 px – 1280 px** (tablettes et petits laptops).

**Dans le périmètre** : les 4 points critiques + les 5 points moyens
identifiés au diagnostic.

**Hors périmètre** (explicite) :

- Téléphone < 768 px.
- Menu hamburger / navigation mobile dédiée.
- Paliers intermédiaires cosmétiques (repli « joli » 4→2→1 colonnes).
- Refonte mobile-first.
- Redéploiement Docker Compose sur electron-server (post-merge,
  hors de ce travail — noté dans la PR).

## Diagnostic

L'architecture de style mélange trois paradigmes : ~60 % classes CSS
nommées (`src/styles.css`), ~30 % styles inline `style={{}}` dans le
JSX, ~10 % classes Tailwind (confinées à `ChatPlayground/*`,
`ModelCard.tsx`, `ModelDetail/*`). Conséquence : l'unique `@media`
existant ne corrige **que** les classes nommées qu'il liste — il rate
structurellement tout le style inline et l'intégralité du header.

La classe conteneur `.wrap` (`styles.css:119-123`,
`max-width:1320px` + padding) rétrécit correctement : la base est
saine, le problème est entièrement dans les **enfants à largeur fixe**
et les **grilles inline**.

### Points de casse retenus

| # | Zone | Gravité | Localisation |
|---|------|---------|--------------|
| 1 | Header — nav 5 items sans `flex-wrap`, ~880 px de contenu | Critique | `Header.tsx:3-9,37` ; `styles.css:255-259` |
| 2 | Status — `.board-row` 7 colonnes (~856 px mini) | Critique | `styles.css:1084-1095` |
| 3 | Status — `SummaryStat` `repeat(4,1fr)` inline, chiffres serif 48 px coupés | Critique | `status.lazy.tsx:204` |
| 4 | Modèles — `.worker-row` grille 6 colonnes mais 9 enfants rendus | Critique | `styles.css:467-476` ; `models.index.lazy.tsx:303` |
| 5 | Accueil — bande CTA `1fr 1fr` inline | Moyen | `index.tsx:226-232` |
| 6 | À propos — grille `BACKENDS` `repeat(2,1fr)` inline | Moyen | `about.lazy.tsx:73-78` |
| 7 | Détail modèle — `.dl-grid` `1fr 1fr` non couvert par le `@media` | Moyen | `styles.css:1417-1422` |
| 8 | Status — bloc bas `1fr 1fr` inline | Moyen | `status.lazy.tsx:293` |
| 9 | Topstrip — `overflow:hidden` masque les dernières cellules | Moyen | `styles.css:134-141` |

Points laissés tels quels (déjà corrects) : tables Bench/Catalog
(`overflowX:auto` déjà présent), composant `ChatPlayground`
(Tailwind `flex-col` fluide), Footer (`@media:1100` déjà couvrant),
page Transparency (`.prose` à `max-width:68ch`).

## Approche retenue — A : CSS étendu

Parmi trois options évaluées (A : CSS étendu ; B : Tailwind partout ;
C : critiques seulement), l'approche **A** est retenue. Elle prolonge
le pattern dominant du site (60 % CSS nommé), donne **un seul endroit**
où raisonner sur le responsive (le bloc `@media`), et minimise la
churn JSX. L'option B injecterait un troisième paradigme tout en
laissant quand même les classes nommées dépendantes de `@media` ;
l'option C laisserait 5 défauts dont la correction est quasi gratuite
une fois le pattern A en place.

## Mécanique commune

1. **Breakpoint unique** : introduire `@media (max-width: 1024px)` comme
   seul point de bascule responsive. Les deux `@media` existants
   (900 px et 1100 px) sont fusionnés dans ce bloc unique. Raison :
   1024 px est la frontière tablette-paysage canonique et tous les
   points critiques cassent sous ~1000 px, ce qui laisse une marge.

2. **Deux règles de repli selon la nature du contenu** :
   - Grilles de **contenu** → repli en **1 colonne** sous le seuil.
     Exception : `SummaryStat` → **2 colonnes** (pas 1), pour garder
     les chiffres serif 48 px lisibles.
   - Tableaux de **données denses** (`.board-row`, `.worker-row`) →
     enveloppe `overflow-x: auto` avec un `min-width` sur les lignes.
     La structure tabulaire et l'alignement colonne-à-colonne sont
     préservés ; pas de restructuration en cartes empilées. Ce
     comportement est déjà celui des tables Bench/Catalog du site.

3. **Migration inline → classes nommées** : les 4 grilles
   `style={{gridTemplateColumns}}` inline (points 3, 5, 6, 8) sont
   remplacées par des classes CSS nommées (`.summary-grid`,
   `.cta-split`, `.backends-grid`, `.status-split`) afin qu'elles
   tombent sous le contrôle du bloc `@media`. Aucun changement visuel
   desktop attendu.

## Corrections détaillées par page

### Header (`Header.tsx`, `styles.css:202-309`)

- `.nav` : ajouter `flex-wrap: wrap`.
- `.masthead-inner` : hauteur fixe `64px` → `min-height: 64px` pour
  autoriser la croissance verticale quand la nav passe sur 2 lignes.
- Sous le seuil, la nav s'enroule proprement sous la marque. **Pas de
  menu hamburger** (outil desktop).

### Status (`status.lazy.tsx`, `styles.css:1084-1118`)

- `.fleet-board` / `.board-row` : envelopper dans un conteneur
  `overflow-x: auto` ; donner un `min-width` aux lignes pour préserver
  les 7 colonnes et la sparkline `.latency-bar`.
- `SummaryStat` (`status.lazy.tsx:204`) : remplacer le
  `style={{gridTemplateColumns:'repeat(4,1fr)'}}` par une classe
  `.summary-grid` ; sous le seuil, repli `4 → 2` colonnes.
- Bloc bas (`status.lazy.tsx:293`) : remplacer le `1fr 1fr` inline par
  une classe `.status-split` ; sous le seuil, repli en 1 colonne.

### Modèles (`models.index.lazy.tsx`, `styles.css:467-476`)

- **Préalable — correction de bug** : `.worker-row` déclare
  `grid-template-columns` à 6 colonnes alors que le JSX
  (`models.index.lazy.tsx:303`) rend 9 blocs enfants. Aligner le
  template sur les 9 blocs réellement rendus. Cette correction
  **modifie aussi l'affichage desktop** de cette ligne (le bug y est
  déjà visible) — c'est assumé et nécessaire avant tout traitement
  responsive.
- Ensuite, appliquer le même traitement scroll-container que
  `.board-row`.

### Accueil (`index.tsx:226-232`)

- Bande CTA : remplacer le `style={{gridTemplateColumns:'1fr 1fr'}}`
  par une classe `.cta-split` ; repli 1 colonne sous le seuil.

### Détail modèle (`styles.css:1417-1422`)

- `.dl-grid` : ajouter la classe à la liste du bloc `@media` ; repli
  1 colonne sous le seuil. `.detail-grid` est déjà couvert.

### À propos (`about.lazy.tsx:73-78`)

- Grille `BACKENDS` : remplacer le
  `style={{gridTemplateColumns:'repeat(2,1fr)'}}` par une classe
  `.backends-grid` ; repli 1 colonne sous le seuil.

### Topstrip (`styles.css:134-141`)

- `.topstrip-inner` : `overflow: hidden` → `overflow-x: auto`, pour
  que les dernières cellules soient scrollables au lieu d'être
  coupées et invisibles.

### Inchangé

Bench, Catalog, Chat/Playground, Footer, Transparency : aucune
modification (déjà fluides ou déjà `overflow-x: auto`).

## Risques & mitigations

- **Abaissement du breakpoint 1100 → 1024 px** : entre 1024 et
  1100 px, les grilles précédemment repliées à 1100 px restent
  multi-colonnes. Acceptable (le diagnostic confirme que ces layouts
  tiennent dans cette plage) ; à confirmer par la vérification
  visuelle.
- **Correction `.worker-row`** : change l'affichage desktop d'une
  ligne. Risque maîtrisé — l'état actuel est un bug ; à valider sur
  capture desktop avant/après.
- **Migration inline → classes** : modifie le JSX. Risque faible ;
  vérifier qu'aucun comportement ne dépend des styles inline retirés.

## Validation

- Type-check : `pnpm --filter cockpit-public typecheck`.
- Build : `pnpm --filter cockpit-public build`.
- Lint : `biome check .`.
- Vérification visuelle : dev server + captures Playwright aux
  largeurs **768 / 1024 / 1280 px** sur les 8 pages. L'API backend
  peut être indisponible — la structure des grilles reste visible via
  les états de chargement.
- Revue par un agent `critic` avant le commit de PR, conformément à
  la règle utilisateur `feedback_critic_before_ship`.

## Livraison

- Branche `feat/responsive-anti-casse` depuis `main` (clone local
  `/Users/electron/ailiance-demo`).
- Commits respectant les hooks du repo (sujet ≤ 50 car., corps
  ≤ 72 car., pas d'attribution AI).
- Pull request vers `ailiance/ailiance-demo`.
- Redéploiement Docker Compose sur electron-server : post-merge, hors
  périmètre — signalé dans la description de la PR.

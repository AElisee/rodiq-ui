# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Projet

Front Next.js de RODIQ (salon d'onglerie + boutique), en français. L'authentification (clients et admin), les
réglages, la carte des prestations, les réservations, la boutique, ses commandes, la Clientèle et le comptage des visiteurs passent par l'API ; les autres données sont encore une **maquette** dans des stores zustand
persistés dans le `localStorage`. L'API
(NestJS + TypeORM + MariaDB, dépôt séparé `../api-rodiq`) est spécifiée dans `docs/backend.md` et son
installation dans `docs/installation-backend.md`.

## Commandes

Gestionnaire de paquets : **pnpm**.

- `pnpm dev` : serveur de dev (http://localhost:3000)
- `pnpm build` / `pnpm start`
- `pnpm lint` : ESLint (config `eslint-config-next`)
- `pnpm exec tsc --noEmit` : vérification des types

Il n'y a pas de tests.

Next.js 16.4 + React 19.3 : lire la doc embarquée dans `node_modules/next/dist/docs/` avant d'utiliser une
API Next (voir AGENTS.md). `next.config.ts` active `cacheComponents` et `partialPrefetching` ; les props de
layout/page utilisent les types globaux générés (`LayoutProps<"/">`, `PageProps<…>`).

## Architecture

- `app/(site)/` : site public (accueil, prestations, réservation, boutique, panier, commande, connexion,
  inscription, historiques « mes réservations / mes commandes »). `template.tsx` fait un fondu entre pages
  via `<ViewTransition>`.
- `app/admin/` : back-office. `connexion/` est public ; `(espace)/` est enveloppé par `AdminShell`
  (menu latéral + contrôle de session côté navigateur).
- Chaque route garde ses composants propres dans un dossier `_components/` ; les composants partagés sont
  dans `components/` (`ui/` = shadcn, `admin/` = briques communes de l'admin, `layout/`, `forms/`…).
- `lib/*.ts` (`prestations`, `produits`, `reservations`, `commandes`) : types de référence, données
  initiales du catalogue et règles métier (transitions de statut décrites en tête de `reservations.ts` et
  `commandes.ts`). Réserver exige un compte : créneaux, places, délai d'annulation (`canCancel`,
  `cancellationDeadline`) et références sont calculés par l'API, jamais par le navigateur.
- `lib/api/` : **seule couche qui parle à l'API**. `client.ts` (URL `NEXT_PUBLIC_API_URL`, cookies
  `credentials: "include"`, `ApiError`, `errorMessage` pour les toasts), `endpoints.ts` (tous les chemins),
  un service par ressource (`auth.ts`, `parametres.ts`, `prestations.ts`, `reservations.ts`, `boutique.ts`, `commandes.ts`, `comptes.ts`, `visites.ts`) qui traduit les DTO de l'API (noms français) vers les
  types du front. Les composants n'appellent jamais l'API : ils passent par les stores.
- `lib/stores/` : **un store = une ressource d'API**. `auth-store`, `admin-store`, `settings-store`,
  `prestations-store`, `reservation-store` (réservations du compte connecté, `useMyReservations`), `slots-store`
  (créneaux), `admin-reservations-store` (liste paginée côté serveur, fiche, actions, pastille, tableau de
  bord), `shop-store` (boutique vue par le site : catégories, page de produits, produits lus un par un pour la
  fiche, le panier et la commande) et `admin-boutique-store` (catégories, liste paginée, fiches, photos,
  compteurs), `order-store` (commandes du compte connecté, `useMyOrders`), `admin-orders-store` (liste paginée,
  fiche, actions, pastille, toutes les commandes pour les indicateurs), `admin-accounts-store` (Clientèle : liste
  paginée côté serveur, fiche « Historique », export) et `visit-store` (visiteurs uniques par jour : `track` depuis
  `VisitTracker` du site, `load` pour le tableau de bord) sont alimentés par `lib/api/` (non persistés ; hook `use…Hydrated` créé par `createLoadHook` de `remote.ts`, qui
  lance le chargement) ; leurs actions sont asynchrones et lèvent une `ApiError` en cas d'échec. Le site et l'admin lisent et écrivent les
  mêmes stores (`prestations`, `settings`, `auth`, `admin`, `visit`), sauf les réservations
  (`reservation-store` côté site, `admin-reservations-store` côté admin), les commandes (`order-store` /
  `admin-orders-store`) et la boutique (`shop-store` /
  `admin-boutique-store` : le site ne reçoit jamais le stock exact ni les produits masqués) ; `cart` et
  `booking` restent côté navigateur. La table store → endpoint est dans `docs/backend.md` : la tenir à
  jour quand on ajoute une action de store.
- Les stores persistés sont en hydratation manuelle (`skipHydration`) : utiliser le hook
  `use…Hydrated` créé par `createHydrationHook` avant d'afficher leurs données, et `ensureHydrated` avant
  de modifier un store hors de son écran (`lib/stores/hydration.ts`). Les changements de forme passent
  par `version` / `migrate` du middleware `persist`.
- Messages d'erreur : ils disent ce qui s'est réellement passé. Titre du toast = ce qui n'a pas été fait
  (« « Mains » n'a pas été supprimée »), description = `errorMessage(error)` (message de l'API, ou cause
  réseau / serveur / navigateur). Jamais de toast de succès avant la réponse de l'API, jamais une liste vide à la
  place d'une lecture échouée.
- Boutique : photos servies par l'API (`apiFileUrl` préfixe les chemins `/api/boutique/photos/…`), réduites
  dans le navigateur sous 600 Ko (`lib/images.ts`) avant l'envoi ; envoyées avec le produit à sa création,
  ensuite une par une depuis la fiche admin. Commander exige un compte ; l'API retire le stock à la commande et le
  rend à l'annulation.
- Validation des formulaires : react-hook-form + zod (`lib/validation.ts`, `components/forms/form-fields.tsx`).
- Comptes : gérés par l'API (admin créé depuis `ADMIN_EMAIL` / `ADMIN_PASSWORD` de `../api-rodiq/.env`).
  L'écran Clientèle lit `GET /admin/comptes` (activité et dépenses calculées par l'API) ; lecture seule.

## Conventions

- Code, commentaires, libellés et routes en **français**. Composants en fonctions fléchées `const` avec
  `export default` en bas de fichier pour les pages/layouts.
- Couleurs : uniquement les tokens de la charte définis dans `app/globals.css` (`pearl`, `blush`, `sand`,
  `taupe`, `cocoa`, `gold`), sans modificateur d'opacité et jamais d'hexadécimal dans un composant.
- Boutons du site public : `bg-blush text-cocoa hover:bg-sand` (pilule `rounded-full`). Dans `/admin` :
  boutons cocoa/pearl via les classes partagées de `components/admin/admin-ui.tsx`.
- Libellés neutres (« Clientèle », « Client(e) », pas « cliente » seul) ; pas de mention « (facultatif) »
  sur les champs optionnels, seuls les obligatoires sont marqués avec `<Required />`.

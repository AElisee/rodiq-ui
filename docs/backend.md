# Passage au backend

La maquette fonctionne entièrement dans le navigateur : chaque store zustand de `lib/stores/` joue le rôle
d'une future ressource de l'API. Le site et l'admin lisent et écrivent **les mêmes stores**, donc remplacer
un store par des appels API branche les deux côtés d'un coup.

## Ressources

| Store (clé localStorage)                  | Ressource API          | Lu par le site                                   | Modifié par l'admin                        |
| ----------------------------------------- | ---------------------- | ------------------------------------------------ | ------------------------------------------ |
| `auth-store` (`rodiq-auth`)               | `accounts`, session    | connexion, inscription, réservation, commande    | lecture seule (Clientèle)                  |
| `admin-store` (`rodiq-admin`)             | session admin          | —                                                | connexion `/admin/connexion`               |
| `catalog-store` (`rodiq-catalog`)         | `prestation-categories`, `prestations`, `product-categories`, `products` | prestations, réservation, boutique, panier | Prestations › Catalogue prestations, Prestations › Catégories, Boutique › Produits, Boutique › Catégories |
| `reservation-store` (`rodiq-reservations`) | `reservations`        | réservation, mes réservations                    | Réservations, tableau de bord, Clientèle   |
| `order-store` (`rodiq-orders`)            | `orders`               | commande, mes commandes                          | Commandes, tableau de bord, Clientèle      |
| `settings-store` (`rodiq-settings`)       | `settings`             | créneaux, horaires, contact, logo, frais de port | Réglages                                   |
| `visit-store` (`rodiq-visits`)            | `stats/visits`         | compteur (une visite par session)                | tableau de bord                            |
| `cart-store`, `booking-store`             | — (reste côté navigateur) | panier, sélection en cours                    | —                                          |

Les types de référence sont dans `lib/reservations.ts`, `lib/commandes.ts`, `lib/prestations.ts`,
`lib/produits.ts` et `lib/stores/settings-store.ts`.

## Points d'API (une action de store → un appel)

### Comptes

- `POST /auth/sign-up` ← `signUp` · `POST /auth/sign-in` ← `signIn` · `POST /auth/sign-out` ← `signOut`
- `GET /me`
- À l'inscription, rattacher au compte les réservations et commandes passées **sans compte** avec la même
  adresse e-mail (fait aujourd'hui par `linkGuestHistory` dans `auth-store.ts`).
- `GET /admin/accounts` (Clientèle : comptes avec leurs réservations et commandes)

### Réservations

- `GET /slots` : créneaux réservables avec places restantes (calcul actuel : `getSlots` + réservations
  actives, voir `booking-flow.tsx`)
- `POST /reservations` ← `add` · `GET /me/reservations`
- `POST /reservations/:id/cancel` ← `cancel` (par le compte qui a réservé, motif optionnel)
- Admin : `GET /admin/reservations`, `GET /admin/reservations/:id`,
  `POST …/:id/confirm` ← `confirm`, `POST …/:id/reject` ← `reject` (motif obligatoire),
  `POST …/:id/complete` ← `complete`

### Commandes

- `POST /orders` ← `add` · `GET /me/orders`
- Admin : `GET /admin/orders`, `GET /admin/orders/:id`, `POST …/:id/accept` ← `accept`,
  `POST …/:id/ready` ← `markReady`, `POST …/:id/deliver` ← `deliver`, `POST …/:id/cancel` ← `cancel`
  (motif obligatoire), `POST …/:id/paid` ← `markPaid`

### Catalogue

- `GET /prestations` (catégories dans l'ordre d'affichage, chacune avec ses prestations dans l'ordre) · admin :
  `POST /admin/prestation-categories` et `PUT /admin/prestation-categories/:id` ← `savePrestationCategory`,
  `DELETE /admin/prestation-categories/:id` ← `removePrestationCategory`,
  `PUT /admin/prestation-categories/order` (liste des identifiants) ← `movePrestationCategory`
- `PUT /admin/prestations/:id` ← `savePrestation` (crée ou modifie, et peut changer de catégorie),
  `DELETE /admin/prestations/:id` ← `removePrestation`,
  `PUT /admin/prestation-categories/:id/prestations/order` (liste des identifiants) ← `movePrestation`
- Une catégorie de prestations a un `id` (slug tiré du nom, conservé ensuite : il sert d'ancre sur
  `/prestations`), un `name` et une `tagline` (accroche, peut être vide). Une prestation a un `id`
  (slug du nom + suffixe aléatoire), un `name`, un `price`, `fromPrice` (prix « dès ») et une `note`. Le site
  n'affiche que les catégories qui ont au moins une prestation. Les catégories de départ
  (`prestationCategories` de `lib/prestations.ts`) servent de données initiales.
- `GET /product-categories` (dans l'ordre d'affichage) · admin : `POST /admin/product-categories` et
  `PUT /admin/product-categories/:id` ← `saveProductCategory`, `DELETE /admin/product-categories/:id` ←
  `removeProductCategory`, `PUT /admin/product-categories/order` (liste des identifiants) ←
  `moveProductCategory`
- Une catégorie a un `id` (slug tiré du nom, conservé ensuite), un `name` et une `description` (texte des
  fiches produit sans description propre ; peut être vide). La boutique n'affiche que les catégories qui ont
  au moins un produit visible. Les catégories de départ (`productCategories` de `lib/produits.ts`) servent de
  données initiales ; `getCategory` (métadonnées des fiches) lira la table.
- `GET /products` (sans les produits masqués) · `GET /products/:id` · admin : `GET /admin/products` (tous),
  `POST /admin/products` et `PUT /admin/products/:id` ← `saveProduct`, `DELETE /admin/products/:id` ←
  `removeProduct`, `POST /admin/products/:id/photos` (remplace les data URL)
- Avec le backend, les produits du catalogue (`lib/produits.ts`) et ceux ajoutés depuis l'admin
  (`customProducts`) deviennent une seule table ; `productOverrides` et `resetProduct` disparaissent.
- Un produit a soit un `stock`, soit des `variants` (déclinaisons au prix du produit, chacune avec son
  `stock`), et un `lowStockThreshold`. `capacity` (ml, cl, L) et `weight` (g, kg) sont facultatifs :
  `{ value, unit }`. « Épuisé » se déduit du stock (`withSoldOut`).
- `GET /admin/stock-alerts` : déclinaisons ou produits sous leur seuil (`stockAlerts`), pour le tableau de
  bord et la pastille du menu.

### Réglages

- `GET /settings` (public : horaires, règles, contact, logos, adresse, position, frais de port)
- Admin : un `PUT` par bloc de l'écran Réglages (`setRules`, `setDay`, `setSlotFormat`, `addClosedDate` /
  `removeClosedDate`, `setPlatform`, `setLogo`, `setSalon`, `setLocation`, `setShipping`, `reset`)

## Règles à appliquer côté serveur

Elles sont vérifiées dans l'interface, mais le serveur doit les revérifier :

- **Créneau** : il existe dans les horaires, n'est pas un jour fermé, respecte `minNoticeHours` et
  `bookingWindowDays`, et il reste une place (`slotCapacity`, `null` = illimité). Seules les réservations
  `en_attente` et `confirmee` occupent une place (`isActive`). Vérifier dans une transaction pour éviter
  deux réservations sur la dernière place.
- **Annulation côté site** : seulement pour ses propres réservations actives, au plus tard
  `cancellationNoticeDays` jours avant (`canCancel`).
- **Transitions** de statut : voir les commentaires en tête de `lib/reservations.ts` et `lib/commandes.ts`.
  « Soin terminé » seulement le jour même ou après ; refus et annulation admin avec motif.
- **Prix figés** : les lignes d'une réservation (`lines`) et d'une commande (`lines`) gardent nom et prix
  au moment de la demande. Le serveur les recalcule depuis le catalogue à la création, sans faire
  confiance aux prix envoyés par le navigateur, de même que les frais de livraison (`deliveryFeeFor`).
- **Catégories de prestations** : nom obligatoire (2 caractères au moins) et unique ; refuser la suppression
  d'une catégorie qui a encore des prestations et l'enregistrement d'une prestation dont la catégorie n'existe
  pas. Une réservation ne peut viser que des prestations existantes.
- **Catégories de produits** : nom obligatoire et unique ; refuser la suppression d'une catégorie qui a encore
  des produits (masqués compris) et l'enregistrement d'un produit dont la catégorie n'existe pas.
- **Commande** : refuser les produits masqués, les déclinaisons inconnues et toute quantité supérieure au
  stock restant ; décrémenter le stock dans la même transaction que la création de la commande
  (aujourd'hui `moveStock` dans `order-store.ts`), et le rendre à l'annulation.
- **Références** (`RDQ-…`, `CMD-…`) générées et garanties uniques par le serveur.
- **Accès** : un compte ne lit que ses réservations et commandes ; tout `/admin/*` exige la session admin.

## Ce qui disparaît avec le backend

- Hachage SHA-256 des mots de passe dans le navigateur et comptes de démonstration
  (`auth-store.ts`, `admin-store.ts`, `.env.example`) : remplacés par une vraie authentification
  (hachage lent côté serveur, cookie de session `httpOnly`).
- Protection de l'admin côté navigateur (`admin-shell.tsx`) : à doubler par une vérification serveur
  (`proxy.ts` ou dans chaque route).
- Données de démonstration (`lib/demo-data.ts`, réservations de démonstration de `reservation-store.ts`)
  et migrations `version` / `migrate` des stores.
- Logos et photos des produits ajoutés en data URL (`setLogo`, `lib/images.ts`), photos importées dans
  `lib/produits.ts` : à remplacer par un stockage de fichiers.
- Hooks `use…Hydrated` : à remplacer par l'état de chargement des requêtes.

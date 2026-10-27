# Passage au backend

La maquette fonctionne entièrement dans le navigateur : chaque store zustand de `lib/stores/` joue le rôle
d'une future ressource de l'API. Le site et l'admin lisent et écrivent **les mêmes stores**, donc remplacer
un store par des appels API branche les deux côtés d'un coup.

## Ressources

| Store (clé localStorage)                  | Ressource API          | Lu par le site                                   | Modifié par l'admin                        |
| ----------------------------------------- | ---------------------- | ------------------------------------------------ | ------------------------------------------ |
| `auth-store` (**branché sur l'API**)      | session client         | connexion, inscription, réservation, commande    | lecture seule (Clientèle)                  |
| `admin-store` (**branché sur l'API**)     | session admin          | —                                                | connexion `/admin/connexion`               |
| `prestations-store` (**branché sur l'API**) | `prestations`        | prestations, réservation, mes réservations       | Prestations › Catalogue prestations, Prestations › Catégories |
| `catalog-store` (`rodiq-catalog`)         | `product-categories`, `products` | boutique, panier                     | Boutique › Produits, Boutique › Catégories |
| `reservation-store` (**branché sur l'API**) | `me/reservations`, `reservations` | réservation, mes réservations (compte connecté) | —                                  |
| `slots-store` (**branché sur l'API**)     | `creneaux`             | réservation (créneaux et places libres)          | —                                          |
| `admin-reservations-store` (**branché sur l'API**) | `admin/reservations` | —                                       | Réservations, fiche, pastille du menu, tableau de bord, Clientèle |
| `order-store` (`rodiq-orders`)            | `orders`               | commande, mes commandes                          | Commandes, tableau de bord, Clientèle      |
| `settings-store` (**branché sur l'API**)  | `parametres`           | créneaux, horaires, contact, logo, frais de port | Réglages                                   |
| `visit-store` (`rodiq-visits`)            | `stats/visits`         | compteur (une visite par session)                | tableau de bord                            |
| `cart-store`, `booking-store`             | — (reste côté navigateur) | panier, sélection en cours                    | —                                          |

Les types de référence sont dans `lib/reservations.ts`, `lib/commandes.ts`, `lib/prestations.ts`,
`lib/produits.ts` et `lib/stores/settings-store.ts`.

## Points d'API (une action de store → un appel)

### Comptes

- `POST /auth/sign-up` ← `signUp` (409 : e-mail déjà utilisé) · `POST /auth/sign-in` ← `signIn` ·
  `POST /auth/sign-out` ← `signOut`
- `GET /me` ← `restore` (lancé par `useAuthHydrated`)
- Admin : `POST /admin/auth/sign-in` ← `signIn` · `POST /admin/auth/sign-out` ← `signOut` · `GET /admin/me` ←
  `restore` (`useAdminHydrated`) ; un 401 sur une écriture admin appelle `expire` (retour à la connexion)
- À l'inscription, rattacher au compte les réservations et commandes passées **sans compte** avec la même
  adresse e-mail (fait aujourd'hui par `linkGuestHistory` dans `auth-store.ts`).
- `GET /admin/accounts` (Clientèle : comptes avec leurs réservations et commandes) : **à créer**, l'écran
  Clientèle affiche encore `demoClientAccounts`

### Réservations

Implémenté dans `api-rodiq/src/reservations/`, branché via `lib/api/reservations.ts` et trois stores :
`reservation-store` (réservations du compte connecté : `load` ← `GET /me/reservations`, relu quand le compte
change ; `add` ← `POST /reservations` ; `cancel` ← `POST /me/reservations/:id/annuler`), `slots-store`
(`GET /creneaux`, relu après chaque demande ou refus) et `admin-reservations-store` (`loadPage` ← liste
paginée, `loadDetail` ← fiche, `confirm` / `reject` / `complete`, `pendingCount` ← `statut=en_attente&parPage=1`
pour la pastille du menu, `loadAll` ← toutes les pages pour le tableau de bord et la Clientèle, `fetchMatching`
← toutes les pages des filtres pour l'export). Un refus 400 / 404 / 409 relit les listes et les créneaux.
Le tableau de bord lit toutes les réservations page après page : à remplacer par une route de statistiques
quand le volume grandira.

**Réserver exige un compte client** : plus de réservation sans
compte ni de rattachement par e-mail (`claim` / `linkGuestHistory` à retirer : l'e-mail n'est pas vérifié, n'importe
qui pourrait récupérer l'historique d'une autre cliente). Le formulaire doit donc connecter la cliente ou créer son
compte (`POST /auth/sign-up`) **avant** `POST /reservations` : c'est ce que fait `booking-flow.tsx`.

Forme d'une réservation (`ReservationDto`) : `{ id, reference, date, debut, fin, statut, lignes: [{ prestationId,
nom, prix, prixAPartirDe }], total, totalAPartirDe, contact: { prenom, nom, telephone, whatsapp, email },
canalContact, note, motifRefus, motifAnnulation, creeLe, traiteeLe }`. Côté cliente s'ajoutent `annulable` et
`dateLimiteAnnulation` (calculés par le serveur, remplacent `canCancel`) ; côté admin `compteId`.

- `GET /creneaux` (public) : `[{ date, debut, fin, placesRestantes }]` sur la fenêtre de réservation (`null` =
  illimité, `0` = complet), remplace `getSlots` + comptage dans `booking-flow.tsx`.
- `POST /reservations` ← `add`, corps `{ prestationIds, date, debut, canalContact, note? }` : coordonnées tirées du
  compte, prix de la carte. **400** créneau non réservable ou prestation retirée (raison précise), **409** créneau
  complet, déjà réservé par la cliente, ou 3 réservations actives à venir déjà en cours, **429** au-delà de 5
  demandes par minute.
- `GET /me/reservations` (la plus récente d'abord) · `POST /me/reservations/:id/annuler` ← `cancel` (`{ motif? }` ;
  **409** hors délai ou déjà traitée, **404** si elle n'est pas à la cliente).
- Admin : `GET /admin/reservations?statut=&quand=a-venir|passees&q=&tri=date-asc|date-desc|demande|nom&page=&parPage=`
  → `{ elements, total, page, parPage, parStatut }` (filtres, recherche et pagination côté serveur,
  `parPage` ≤ 100 ; `parStatut` = nombre par statut avec les autres filtres, pour les compteurs),
  `GET /admin/reservations/:id`, `POST …/:id/confirmer` ← `confirm`, `POST …/:id/refuser` ← `reject`
  (`{ motif }`, 5 caractères au moins), `POST …/:id/terminer` ← `complete`. Chaque action renvoie la réservation à
  jour ; **409** avec la raison si le statut a changé entre-temps ou si la date ne le permet pas.
- `POST /admin/parametres/fermetures` répond **409** si le jour a encore des réservations en attente ou confirmées
  (références listées) : les refuser d'abord.

### Commandes

- `POST /orders` ← `add` · `GET /me/orders`
- Admin : `GET /admin/orders`, `GET /admin/orders/:id`, `POST …/:id/accept` ← `accept`,
  `POST …/:id/ready` ← `markReady`, `POST …/:id/deliver` ← `deliver`, `POST …/:id/cancel` ← `cancel`
  (motif obligatoire), `POST …/:id/paid` ← `markPaid`

### Catalogue

Prestations : implémenté dans `api-rodiq/src/prestations/`, branché via `lib/api/prestations.ts` et
`prestations-store`. Chaque écriture admin renvoie **toute la carte** (même forme que `GET /prestations`) : le
store remplace `categories` avec la réponse ; sur un refus 400 / 404 / 409 il relit la carte (elle a pu être
modifiée ailleurs). Si la lecture échoue, `loadError` garde la raison : le site l'affiche au lieu d'une carte
vide (`CarteGuard`), l'admin affiche un bandeau « Relire la carte » (`CarteLoadError`). Noms de champs : catégorie `{ id, nom, accroche, prestations }`, prestation
`{ id, nom, prix, prixAPartirDe, precision }` (`accroche` et `precision` valent `""` si vides). Les identifiants
sont générés par le serveur (catégorie : slug du nom, suffixé `-2`… s'il est pris, conservé ensuite ;
prestation : slug + 4 caractères aléatoires).

- `GET /prestations` (public) : catégories dans l'ordre d'affichage, vides comprises, chacune avec ses
  prestations dans l'ordre ; liste vide tant que rien n'est créé. Le site masque les catégories vides.
- `POST /admin/prestations/categories` (`{ nom, accroche }`, placée en fin) et
  `PUT /admin/prestations/categories/:id` ← `savePrestationCategory` (**409** : nom déjà pris, casse et
  accents ignorés ; **404** : catégorie inconnue)
- `DELETE /admin/prestations/categories/:id` ← `removePrestationCategory` (**409** si elle a encore des
  prestations)
- `PUT /admin/prestations/categories/ordre` (`{ ids }` : tous les identifiants, dans le nouvel ordre) ←
  `movePrestationCategory`
- `POST /admin/prestations` (`{ categorieId, nom, prix, prixAPartirDe, precision }`, placée en fin de sa
  catégorie) et `PUT /admin/prestations/:id` (même corps ; changer `categorieId` la place en fin de la
  nouvelle catégorie) ← `savePrestation` (**400** : catégorie inconnue ; **404** : prestation inconnue)
- `DELETE /admin/prestations/:id` ← `removePrestation`
- `PUT /admin/prestations/categories/:id/ordre` (`{ ids }` : toutes les prestations de la catégorie) ←
  `movePrestation`
- Les actions `move…` du store (décalage -1 / +1) calculent la liste complète et l'envoient ; un ordre qui
  n'est pas une permutation des identifiants existants est refusé (**400**). Les catégories de départ
  (`prestationCategories` de `lib/prestations.ts`) ne sont pas créées automatiquement : à saisir depuis l'admin.
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

Implémenté dans `api-rodiq/src/settings/`. Routes et attributs en français (hors authentification) : même
structure que l'état du `settings-store`, mais noms de champs traduits (`regles`, `semaine`,
`dureeCreneauMinutes`, `placesParCreneau`, `fermetures`, `plateforme`, `salon`, `position`, `livraisons`…).
Chaque écriture admin renvoie **tous** les réglages (même forme que `GET /parametres`) : le store peut
remplacer son état avec la réponse.

- `GET /parametres` (public : horaires, règles, fermetures à venir, contact, logos, adresse, position, frais
  de port). Répond **404** tant que le salon n'est pas configuré ; les écritures ci-dessous aussi.
- Première configuration : `POST /admin/parametres`, une seule fois (**409** ensuite). Même corps que la
  lecture, sans les logos ni les fermetures (`plateforme`, `semaine`, `dureeCreneauMinutes`,
  `placesParCreneau`, `regles`, `salon`, `position`, `livraisons`) ; logos et fermetures s'ajoutent ensuite
  par leurs routes. ← `configure` (bouton « Créer les réglages » de l'écran Réglages, avec `defaultSettings`) ;
  tant que le salon n'est pas configuré, le site affiche `defaultSettings`.
- Onglet Plateforme : `PUT /admin/parametres/plateforme` ← `setPlatform` (sans les logos ; téléphones
  acceptés avec ou sans `+225`, renvoyés au format `+225 07 00 00 00 00`),
  `PUT /admin/parametres/logos/:variante` (`{ image }` en data URL, 500 Ko au plus) et
  `DELETE /admin/parametres/logos/:variante` ← `setLogo`
- Onglet Horaires et créneaux : `PUT /admin/parametres/horaires`
  (`{ semaine, dureeCreneauMinutes, placesParCreneau }`, les 7 jours d'un coup) ← `setHours`
- Onglet Réservation : `PUT /admin/parametres/regles` ← `setRules`
- Onglet Fermetures : `POST /admin/parametres/fermetures` (`{ date, motif }`) ← `addClosedDate` (refuse une
  date passée), `DELETE /admin/parametres/fermetures/:date` ← `removeClosedDate`
- Onglet Salon et position : `PUT /admin/parametres/salon` (`{ adresse, position: { latitude, longitude } }`)
  ← `setSalon`
- Onglet Livraisons et expéditions : `PUT /admin/parametres/livraisons` (`{ domicile, expedition }`, chaque
  tarif `{ destination, frais }`) ← `setShipping` (destinations uniques par liste)

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

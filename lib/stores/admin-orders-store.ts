import { create } from "zustand";
import { errorMessage, isApiError } from "@/lib/api/client";
import { type OrdersPage, type OrdersQuery, commandesApi } from "@/lib/api/commandes";
import type { Order } from "@/lib/commandes";
import { useAdminStore } from "./admin-store";
import { createLoadHook } from "./remote";

// Commandes vues par l'admin. Source : l'API (`lib/api/commandes.ts`), filtrée et paginée côté serveur.
// Les actions lèvent l'ApiError en cas d'échec (le composant affiche le message) ; une session admin
// expirée renvoie à la connexion.
type AdminOrdersState = {
  // Page affichée par l'écran Commandes et les filtres qui l'ont produite
  query: OrdersQuery | null;
  page: OrdersPage | null;
  pageError: string | undefined;
  loadPage: (query: OrdersQuery) => Promise<void>;
  // Fiches ouvertes (écran de détail), par identifiant ; erreur de lecture avec son statut HTTP
  details: Record<string, Order>;
  detailErrors: Record<string, { status: number; message: string }>;
  loadDetail: (id: string) => Promise<void>;
  // Toutes les commandes (indicateurs, tableau de bord, Clientèle, ventes par produit) : lues page après page
  all: Order[];
  allLoaded: boolean;
  allError: string | undefined;
  loadAll: () => Promise<void>;
  // Nouvelles commandes (pastille du menu) ; null tant que le nombre n'est pas connu
  pendingCount: number | null;
  loadPendingCount: () => Promise<void>;
  // Toutes les commandes correspondant aux filtres (export), sans changer l'état
  fetchMatching: (query: OrdersQuery) => Promise<Order[]>;
  accept: (id: string) => Promise<Order>;
  markReady: (id: string) => Promise<Order>;
  deliver: (id: string) => Promise<Order>;
  markPaid: (id: string) => Promise<Order>;
  cancel: (id: string, reason: string) => Promise<Order>;
};

const expireOn401 = (error: unknown) => {
  if (isApiError(error, 401)) useAdminStore.getState().expire();
};

// Numéro de la dernière lecture de page : une réponse plus ancienne (frappe rapide dans la recherche)
// n'écrase pas la plus récente
let pageRequest = 0;

export const useAdminOrdersStore = create<AdminOrdersState>()((set, get) => {
  // Relit tout ce qui affiche des commandes : un changement de statut déplace la commande d'un filtre à
  // l'autre et change les compteurs
  const refresh = () => {
    const { query, allLoaded } = get();
    if (query) void get().loadPage(query);
    if (allLoaded) void get().loadAll();
    void get().loadPendingCount();
  };

  // Changement de statut : remplace la fiche par celle renvoyée, puis relit les listes.
  // Refus 404 / 409 : la commande a changé ailleurs, on relit sa fiche aussi
  const transition = async (id: string, request: () => Promise<Order>) => {
    try {
      const updated = await request();
      set((s) => ({ details: { ...s.details, [id]: updated } }));
      refresh();
      return updated;
    } catch (error) {
      expireOn401(error);
      if (isApiError(error, 404) || isApiError(error, 409)) {
        void get().loadDetail(id);
        refresh();
      }
      throw error;
    }
  };

  return {
    query: null,
    page: null,
    pageError: undefined,
    loadPage: async (query) => {
      const request = ++pageRequest;
      set({ query });
      try {
        const page = await commandesApi.list(query);
        // Page devenue vide (dernières commandes traitées ou filtre resserré) : dernière page non vide
        if (page.orders.length === 0 && page.total > 0 && query.page > 1) {
          if (request === pageRequest) {
            await get().loadPage({ ...query, page: Math.ceil(page.total / query.pageSize) });
          }
          return;
        }
        if (request === pageRequest) set({ page, pageError: undefined });
      } catch (error) {
        expireOn401(error);
        console.error("Lecture des commandes impossible", error);
        if (request === pageRequest) set({ pageError: errorMessage(error) });
      }
    },

    details: {},
    detailErrors: {},
    loadDetail: async (id) => {
      try {
        const order = await commandesApi.get(id);
        set((s) => ({
          details: { ...s.details, [id]: order },
          detailErrors: Object.fromEntries(Object.entries(s.detailErrors).filter(([key]) => key !== id)),
        }));
      } catch (error) {
        expireOn401(error);
        set((s) => ({
          detailErrors: {
            ...s.detailErrors,
            [id]: { status: isApiError(error) ? error.status : -1, message: errorMessage(error) },
          },
        }));
      }
    },

    all: [],
    allLoaded: false,
    allError: undefined,
    loadAll: async () => {
      try {
        const all = await commandesApi.listAll({ status: null, payment: null, mode: null, search: "", sort: "recentes" });
        set({ all, allLoaded: true, allError: undefined });
      } catch (error) {
        expireOn401(error);
        console.error("Lecture des commandes impossible", error);
        set({ allLoaded: true, allError: errorMessage(error) });
      }
    },

    pendingCount: null,
    loadPendingCount: async () => {
      try {
        const { total } = await commandesApi.list({
          status: "en_attente",
          payment: null,
          mode: null,
          search: "",
          sort: "recentes",
          page: 1,
          pageSize: 1,
        });
        set({ pendingCount: total });
      } catch (error) {
        // Pastille seulement : l'écran Commandes affichera l'erreur s'il est ouvert
        expireOn401(error);
        console.error("Lecture des nouvelles commandes impossible", error);
      }
    },

    fetchMatching: async ({ status, payment, mode, search, sort }) => {
      try {
        return await commandesApi.listAll({ status, payment, mode, search, sort });
      } catch (error) {
        expireOn401(error);
        throw error;
      }
    },

    accept: (id) => transition(id, () => commandesApi.accept(id)),
    markReady: (id) => transition(id, () => commandesApi.markReady(id)),
    deliver: (id) => transition(id, () => commandesApi.deliver(id)),
    markPaid: (id) => transition(id, () => commandesApi.markPaid(id)),
    cancel: (id, reason) => transition(id, () => commandesApi.cancelBySalon(id, reason)),
  };
});

// Vrai une fois toutes les commandes lues (ou l'échec constaté : voir `allError`)
export const useAllOrdersLoaded = createLoadHook(
  useAdminOrdersStore,
  (s) => s.allLoaded,
  () => useAdminOrdersStore.getState().loadAll(),
);

// Nombre de nouvelles commandes, chargé au premier affichage du menu
export const usePendingOrdersCount = createLoadHook(
  useAdminOrdersStore,
  (s) => s.pendingCount !== null,
  () => useAdminOrdersStore.getState().loadPendingCount(),
);

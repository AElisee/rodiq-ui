import { create } from "zustand";
import { errorMessage, isApiError } from "@/lib/api/client";
import { type ReservationsPage, type ReservationsQuery, reservationsApi } from "@/lib/api/reservations";
import type { Reservation } from "@/lib/reservations";
import { useAdminStore } from "./admin-store";
import { createLoadHook } from "./remote";

// Réservations vues par l'admin. Source : l'API (`lib/api/reservations.ts`), filtrée et paginée côté serveur.
// Les actions lèvent l'ApiError en cas d'échec (le composant affiche le message) ; une session admin
// expirée renvoie à la connexion.
type AdminReservationsState = {
  // Page affichée par l'écran Réservations et les filtres qui l'ont produite
  query: ReservationsQuery | null;
  page: ReservationsPage | null;
  // Filtres de la page reçue : différents de `query` pendant la lecture de nouveaux filtres
  pageQuery: ReservationsQuery | null;
  pageError: string | undefined;
  loadPage: (query: ReservationsQuery) => Promise<void>;
  // Fiches ouvertes (écran de détail), par identifiant ; erreur de lecture avec son statut HTTP
  details: Record<string, Reservation>;
  detailErrors: Record<string, { status: number; message: string }>;
  loadDetail: (id: string) => Promise<void>;
  // Toutes les réservations (tableau de bord, Clientèle) : lues page après page
  all: Reservation[];
  allLoaded: boolean;
  allError: string | undefined;
  loadAll: () => Promise<void>;
  // Demandes en attente (pastille du menu) ; null tant que le nombre n'est pas connu
  pendingCount: number | null;
  loadPendingCount: () => Promise<void>;
  // Toutes les réservations correspondant aux filtres (export), sans changer l'état
  fetchMatching: (query: ReservationsQuery) => Promise<Reservation[]>;
  confirm: (id: string) => Promise<Reservation>;
  reject: (id: string, reason: string) => Promise<Reservation>;
  complete: (id: string) => Promise<Reservation>;
};

const expireOn401 = (error: unknown) => {
  if (isApiError(error, 401)) useAdminStore.getState().expire();
};

// Numéro de la dernière lecture de page : une réponse plus ancienne (frappe rapide dans la recherche)
// n'écrase pas la plus récente
let pageRequest = 0;

export const useAdminReservationsStore = create<AdminReservationsState>()((set, get) => {
  // Relit tout ce qui affiche des réservations : un changement de statut déplace la réservation
  // d'un filtre à l'autre et change les compteurs
  const refresh = () => {
    const { query, allLoaded } = get();
    if (query) void get().loadPage(query);
    if (allLoaded) void get().loadAll();
    void get().loadPendingCount();
  };

  // Changement de statut : remplace la fiche par celle renvoyée, puis relit les listes.
  // Refus 404 / 409 : la réservation a changé ailleurs, on relit sa fiche aussi
  const transition = async (id: string, request: () => Promise<Reservation>) => {
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
    pageQuery: null,
    pageError: undefined,
    loadPage: async (query) => {
      const request = ++pageRequest;
      set({ query });
      try {
        const page = await reservationsApi.list(query);
        // Page devenue vide (dernières réservations traitées ou filtre resserré) : dernière page non vide
        if (page.reservations.length === 0 && page.total > 0 && query.page > 1) {
          if (request === pageRequest) {
            await get().loadPage({ ...query, page: Math.ceil(page.total / query.pageSize) });
          }
          return;
        }
        if (request === pageRequest) set({ page, pageQuery: query, pageError: undefined });
      } catch (error) {
        expireOn401(error);
        console.error("Lecture des réservations impossible", error);
        if (request === pageRequest) set({ pageQuery: query, pageError: errorMessage(error) });
      }
    },

    details: {},
    detailErrors: {},
    loadDetail: async (id) => {
      try {
        const reservation = await reservationsApi.get(id);
        set((s) => ({
          details: { ...s.details, [id]: reservation },
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
        const all = await reservationsApi.listAll({ status: null, when: "toutes", search: "", sort: "demande" });
        set({ all, allLoaded: true, allError: undefined });
      } catch (error) {
        expireOn401(error);
        console.error("Lecture des réservations impossible", error);
        set({ allLoaded: true, allError: errorMessage(error) });
      }
    },

    pendingCount: null,
    loadPendingCount: async () => {
      try {
        const { total } = await reservationsApi.list({
          status: "en_attente",
          when: "toutes",
          search: "",
          sort: "demande",
          page: 1,
          pageSize: 1,
        });
        set({ pendingCount: total });
      } catch (error) {
        // Pastille seulement : l'écran Réservations affichera l'erreur s'il est ouvert
        expireOn401(error);
        console.error("Lecture des demandes en attente impossible", error);
      }
    },

    fetchMatching: async ({ status, when, search, sort }) => {
      try {
        return await reservationsApi.listAll({ status, when, search, sort });
      } catch (error) {
        expireOn401(error);
        throw error;
      }
    },

    confirm: (id) => transition(id, () => reservationsApi.confirm(id)),
    reject: (id, reason) => transition(id, () => reservationsApi.reject(id, reason)),
    complete: (id) => transition(id, () => reservationsApi.complete(id)),
  };
});

// Vrai une fois toutes les réservations lues (ou l'échec constaté : voir `allError`)
export const useAllReservationsLoaded = createLoadHook(
  useAdminReservationsStore,
  (s) => s.allLoaded,
  () => useAdminReservationsStore.getState().loadAll(),
);

// Nombre de demandes en attente, chargé au premier affichage du menu
export const usePendingReservationsCount = createLoadHook(
  useAdminReservationsStore,
  (s) => s.pendingCount !== null,
  () => useAdminReservationsStore.getState().loadPendingCount(),
);

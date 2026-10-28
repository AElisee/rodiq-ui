import { create } from "zustand";
import { errorMessage, isApiError } from "@/lib/api/client";
import {
  type AccountsPage,
  type AccountsQuery,
  type ClientAccount,
  type ClientAccountDetail,
  comptesApi,
} from "@/lib/api/comptes";
import { useAdminStore } from "./admin-store";

// Comptes clients vus par l'admin (écran Clientèle). Source : l'API (`lib/api/comptes.ts`), recherche, tri
// et pagination côté serveur. Lecture seule : un compte naît de l'inscription sur le site. Une session admin
// expirée renvoie à la connexion.
type AdminAccountsState = {
  // Page affichée par l'écran Clientèle et la recherche qui l'a produite
  query: AccountsQuery | null;
  page: AccountsPage | null;
  pageError: string | undefined;
  loadPage: (query: AccountsQuery) => Promise<void>;
  // Fiches ouvertes (dialogue « Historique »), par identifiant ; erreur de lecture avec son statut HTTP
  details: Record<string, ClientAccountDetail>;
  detailErrors: Record<string, { status: number; message: string }>;
  loadDetail: (id: string) => Promise<void>;
  // Tous les comptes correspondant à la recherche (export), sans changer l'état
  fetchMatching: (query: Omit<AccountsQuery, "page" | "pageSize">) => Promise<ClientAccount[]>;
};

const expireOn401 = (error: unknown) => {
  if (isApiError(error, 401)) useAdminStore.getState().expire();
};

// Numéro de la dernière lecture de page : une réponse plus ancienne (frappe rapide dans la recherche)
// n'écrase pas la plus récente
let pageRequest = 0;

export const useAdminAccountsStore = create<AdminAccountsState>()((set, get) => ({
  query: null,
  page: null,
  pageError: undefined,
  loadPage: async (query) => {
    const request = ++pageRequest;
    set({ query });
    try {
      const page = await comptesApi.list(query);
      // Page au-delà de la dernière (recherche resserrée) : dernière page non vide
      if (page.accounts.length === 0 && page.total > 0 && query.page > 1) {
        if (request === pageRequest) {
          await get().loadPage({ ...query, page: Math.ceil(page.total / query.pageSize) });
        }
        return;
      }
      if (request === pageRequest) set({ page, pageError: undefined });
    } catch (error) {
      expireOn401(error);
      console.error("Lecture des comptes clients impossible", error);
      if (request === pageRequest) set({ pageError: errorMessage(error) });
    }
  },

  details: {},
  detailErrors: {},
  loadDetail: async (id) => {
    try {
      const account = await comptesApi.get(id);
      set((s) => ({
        details: { ...s.details, [id]: account },
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

  fetchMatching: async (query) => {
    try {
      return await comptesApi.listAll(query);
    } catch (error) {
      expireOn401(error);
      throw error;
    }
  },
}));

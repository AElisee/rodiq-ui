import { create } from "zustand";
import { errorMessage, isApiError } from "@/lib/api/client";
import { type JournalDayPage, type JournalEntry, type JournalFilters, journalApi } from "@/lib/api/journal";
import { useAdminStore } from "./admin-store";

// Journal d'activité vu par l'admin. Source : l'API (`lib/api/journal.ts`), filtres côté serveur, une page par jour.
// Lecture seule : les entrées sont écrites par l'API à chaque connexion ou action. Une session admin expirée
// renvoie à la connexion.
type AdminJournalState = {
  // Lecture demandée en dernier et celle de la page reçue : différentes pendant la lecture de nouveaux filtres
  query: JournalQuery | null;
  pageQuery: JournalQuery | null;
  // Jour affiché
  page: JournalDayPage | null;
  pageError: string | undefined;
  loadPage: (filters: JournalFilters, dayNumber: number) => Promise<void>;
  // Toutes les entrées correspondant aux filtres (export), sans changer l'état
  fetchMatching: (filters: JournalFilters) => Promise<JournalEntry[]>;
};

type JournalQuery = { filters: JournalFilters; dayNumber: number };

const expireOn401 = (error: unknown) => {
  if (isApiError(error, 401)) useAdminStore.getState().expire();
};

// Numéro de la dernière lecture : une réponse plus ancienne (frappe rapide, filtres changés) n'écrase pas la
// plus récente
let pageRequest = 0;

export const useAdminJournalStore = create<AdminJournalState>()((set) => ({
  query: null,
  pageQuery: null,
  page: null,
  pageError: undefined,
  // Un jour au-delà du dernier (filtres resserrés) est ramené au dernier par l'API
  loadPage: async (filters, dayNumber) => {
    const request = ++pageRequest;
    const query = { filters, dayNumber };
    set({ query });
    try {
      const page = await journalApi.listDay(filters, dayNumber);
      if (request === pageRequest) set({ page, pageQuery: query, pageError: undefined });
    } catch (error) {
      expireOn401(error);
      console.error("Lecture du journal impossible", error);
      if (request === pageRequest) set({ pageQuery: query, pageError: errorMessage(error) });
    }
  },

  fetchMatching: async (filters) => {
    try {
      return await journalApi.listAll(filters);
    } catch (error) {
      expireOn401(error);
      throw error;
    }
  },
}));

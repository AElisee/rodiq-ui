import { addMonths, format, startOfMonth } from "date-fns";
import { create } from "zustand";
import { errorMessage, isApiError } from "@/lib/api/client";
import { visitesApi } from "@/lib/api/visites";
import { useAdminStore } from "./admin-store";
import { createLoadHook } from "./remote";

// Visiteurs du site. Source : l'API (`lib/api/visites.ts`), qui compte chaque personne une fois par jour.
// Le site signale l'arrivée (`track`), le tableau de bord lit les 12 derniers mois (`load`).
type VisitState = {
  // Visiteurs uniques par jour (yyyy-MM-dd) ; jour absent = aucun visiteur
  days: Record<string, number>;
  loaded: boolean;
  error: string | undefined;
  load: () => Promise<void>;
  track: () => Promise<void>;
};

const SESSION_KEY = "rodiq-visit-counted";

export const useVisitStore = create<VisitState>()((set) => ({
  days: {},
  loaded: false,
  error: undefined,
  load: async () => {
    // Période la plus longue du tableau de bord : les 12 derniers mois, mois en cours compris
    const today = new Date();
    const from = format(startOfMonth(addMonths(today, -11)), "yyyy-MM-dd");
    try {
      const days = await visitesApi.list(from, format(today, "yyyy-MM-dd"));
      set({ days, loaded: true, error: undefined });
    } catch (error) {
      if (isApiError(error, 401)) useAdminStore.getState().expire();
      console.error("Lecture des visiteurs impossible", error);
      set({ loaded: true, error: errorMessage(error) });
    }
  },
  // Un appel par session de navigation : l'API dédoublonne la journée, ce drapeau évite seulement de la
  // solliciter à chaque page. Posé après la réponse, pour réessayer à la page suivante en cas d'échec
  track: async () => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    try {
      await visitesApi.track();
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (error) {
      // Rien à montrer au visiteur : la statistique est seulement manquée
      console.error("Visite non comptée", error);
    }
  },
}));

// Vrai une fois les visiteurs lus (ou l'échec constaté : voir `error`)
export const useVisitsLoaded = createLoadHook(
  useVisitStore,
  (s) => s.loaded,
  () => useVisitStore.getState().load(),
);

import { create } from "zustand";
import { errorMessage } from "@/lib/api/client";
import { reservationsApi } from "@/lib/api/reservations";
import type { Slot } from "@/lib/reservations";
import { createLoadHook } from "./remote";

type SlotsState = {
  // Créneaux de la fenêtre de réservation avec leurs places libres, complets compris
  slots: Slot[];
  // Vrai une fois la première lecture terminée, réussie ou non
  loaded: boolean;
  // Raison de l'échec de la dernière lecture : les créneaux affichés sont alors absents ou périmés
  loadError: string | undefined;
  load: () => Promise<void>;
};

// Créneaux réservables (`GET /creneaux`), relus après chaque demande envoyée ou refusée
export const useSlotsStore = create<SlotsState>()((set) => ({
  slots: [],
  loaded: false,
  loadError: undefined,
  load: async () => {
    try {
      set({ slots: await reservationsApi.slots(), loaded: true, loadError: undefined });
    } catch (error) {
      console.error("Lecture des créneaux impossible", error);
      set({ loaded: true, loadError: errorMessage(error) });
    }
  },
}));

// Vrai une fois les créneaux lus depuis l'API (ou l'échec constaté : voir `loadError`)
export const useSlotsLoaded = createLoadHook(
  useSlotsStore,
  (s) => s.loaded,
  () => useSlotsStore.getState().load(),
);

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type BookingState = {
  // Identifiants des prestations choisies pour la réservation en cours
  selectedIds: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

// Sélection de prestations partagée entre /prestations et /reserver.
// Hydratation manuelle (skipHydration) pour éviter un écart serveur / client.
export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      selectedIds: [],
      toggle: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id],
        })),
      remove: (id) => set((s) => ({ selectedIds: s.selectedIds.filter((x) => x !== id) })),
      clear: () => set({ selectedIds: [] }),
    }),
    {
      name: "rodiq-booking",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);

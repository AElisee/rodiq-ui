import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type BookingState = {
  // Identifiants des prestations choisies pour la réservation en cours
  selectedIds: string[];
  // Créneau choisi (conservé si la cliente part se connecter puis revient)
  slotId: string | null;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  setSlot: (slotId: string | null) => void;
  clear: () => void;
};

// Réservation en cours, partagée entre /prestations, /reservation et /connexion.
// Hydratation manuelle (skipHydration) pour éviter un écart serveur / client.
export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      selectedIds: [],
      slotId: null,
      toggle: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id],
        })),
      remove: (id) => set((s) => ({ selectedIds: s.selectedIds.filter((x) => x !== id) })),
      setSlot: (slotId) => set({ slotId }),
      clear: () => set({ selectedIds: [], slotId: null }),
    }),
    {
      name: "rodiq-booking",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);

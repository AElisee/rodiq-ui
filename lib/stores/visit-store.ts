import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { generateDemoVisits } from "@/lib/demo-data";
import { toDateKey } from "@/lib/reservations";
import { createHydrationHook } from "./hydration";

type VisitState = {
  // Nombre de visiteurs par jour (yyyy-MM-dd)
  days: Record<string, number>;
  track: () => void;
};

const SESSION_KEY = "rodiq-visit-counted";

// Visiteurs du site, comptés une fois par session de navigation.
// Maquette : historique de démonstration + visites de ce navigateur, en attendant l'API.
export const useVisitStore = create<VisitState>()(
  persist(
    (set) => ({
      days: generateDemoVisits(),
      track: () => {
        if (sessionStorage.getItem(SESSION_KEY)) return;
        sessionStorage.setItem(SESSION_KEY, "1");
        const today = toDateKey(new Date());
        set((s) => ({ days: { ...s.days, [today]: (s.days[today] ?? 0) + 1 } }));
      },
    }),
    {
      name: "rodiq-visits",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export const useVisitsHydrated = createHydrationHook(useVisitStore);

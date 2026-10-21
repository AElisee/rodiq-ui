import { addDays, format } from "date-fns";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Reservation } from "@/lib/reservations";
import { createHydrationHook } from "./hydration";

type ReservationState = {
  reservations: Reservation[];
  add: (reservation: Reservation) => void;
  cancel: (id: string, reason?: string) => void;
};

// Données de démonstration : un historique avec chaque statut traité par l'admin
const day = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");
const demoClient = {
  firstName: "Aïcha",
  lastName: "Koné",
  phone: "+225 07 00 00 00 00",
  contactChannel: "whatsapp" as const,
};
const demoReservations: Reservation[] = [
  {
    id: "demo-3",
    reference: "RDQ-H9XC3B",
    prestationIds: ["vernis-permanent-mains", "pose-pieds"],
    slotId: `${day(9)}_11:00`,
    date: day(9),
    start: "11:00",
    end: "13:00",
    client: demoClient,
    status: "confirmee",
    accountRequested: false,
    accountId: "demo-account",
    createdAt: addDays(new Date(), -2).toISOString(),
  },
  {
    id: "demo-1",
    reference: "RDQ-7KH2PM",
    prestationIds: ["pedicure-manucure"],
    slotId: `${day(-24)}_14:00`,
    date: day(-24),
    start: "14:00",
    end: "16:00",
    client: demoClient,
    status: "terminee",
    accountRequested: false,
    accountId: "demo-account",
    createdAt: addDays(new Date(), -30).toISOString(),
  },
  {
    id: "demo-2",
    reference: "RDQ-Q4WN8T",
    prestationIds: ["tresses"],
    slotId: `${day(-10)}_09:00`,
    date: day(-10),
    start: "09:00",
    end: "11:00",
    client: demoClient,
    status: "refusee",
    rejectionReason:
      "Les tresses demandent une demi-journée : merci de choisir deux créneaux consécutifs ou de nous appeler.",
    accountRequested: false,
    accountId: "demo-account",
    createdAt: addDays(new Date(), -12).toISOString(),
  },
];

// Réservations de la cliente (maquette : conservées dans le navigateur en attendant l'API).
// Hydratation manuelle (skipHydration) pour éviter un écart serveur / client.
export const useReservationStore = create<ReservationState>()(
  persist(
    (set) => ({
      reservations: demoReservations,
      add: (reservation) => set((s) => ({ reservations: [reservation, ...s.reservations] })),
      cancel: (id, reason) =>
        set((s) => ({
          reservations: s.reservations.map((r) =>
            r.id === id ? { ...r, status: "annulee", cancellationReason: reason } : r,
          ),
        })),
    }),
    {
      name: "rodiq-reservations",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

// Vrai une fois les réservations relues depuis le localStorage
export const useReservationsHydrated = createHydrationHook(useReservationStore);

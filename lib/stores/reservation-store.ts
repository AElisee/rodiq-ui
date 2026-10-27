import { useEffect } from "react";
import { create } from "zustand";
import { errorMessage, isApiError } from "@/lib/api/client";
import { type NewReservation, reservationsApi } from "@/lib/api/reservations";
import type { Reservation } from "@/lib/reservations";
import { selectCurrentAccountId, useAuthHydrated, useAuthStore } from "./auth-store";
import { useSlotsStore } from "./slots-store";

// Réservations de la cliente connectée. Source : l'API (`lib/api/reservations.ts`).
// Les actions lèvent l'ApiError en cas d'échec (le composant affiche le message).
type ReservationState = {
  // Réservations du compte `accountId`, rendez-vous le plus récent d'abord
  reservations: Reservation[];
  // Compte dont les réservations sont chargées (null : rien de chargé)
  accountId: string | null;
  // Raison de l'échec de la dernière lecture
  loadError: string | undefined;
  load: (accountId: string) => Promise<void>;
  // Crée la demande pour la cliente connectée et renvoie la réservation enregistrée
  add: (reservation: NewReservation) => Promise<Reservation>;
  cancel: (id: string, reason?: string) => Promise<void>;
};

const byAppointmentDesc = (a: Reservation, b: Reservation) =>
  `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`);

export const useReservationStore = create<ReservationState>()((set, get) => {
  // Refus du serveur (créneau pris, délai dépassé, statut changé) : la liste et les places ont pu
  // changer ailleurs, on les relit
  const refreshAfterRefusal = (error: unknown) => {
    if (isApiError(error, 400) || isApiError(error, 404) || isApiError(error, 409)) {
      void useSlotsStore.getState().load();
      const { accountId } = get();
      if (accountId) void get().load(accountId);
    }
  };

  return {
    reservations: [],
    accountId: null,
    loadError: undefined,
    load: async (accountId) => {
      try {
        const reservations = await reservationsApi.mine();
        set({ reservations, accountId, loadError: undefined });
      } catch (error) {
        console.error("Lecture des réservations impossible", error);
        set({ reservations: [], accountId, loadError: errorMessage(error) });
      }
    },
    add: async (data) => {
      try {
        const reservation = await reservationsApi.create(data);
        set((s) => ({ reservations: [reservation, ...s.reservations].toSorted(byAppointmentDesc) }));
        void useSlotsStore.getState().load();
        return reservation;
      } catch (error) {
        refreshAfterRefusal(error);
        throw error;
      }
    },
    cancel: async (id, reason) => {
      try {
        const updated = await reservationsApi.cancel(id, reason);
        set((s) => ({ reservations: s.reservations.map((r) => (r.id === id ? updated : r)) }));
        void useSlotsStore.getState().load();
      } catch (error) {
        refreshAfterRefusal(error);
        throw error;
      }
    },
  };
});

// Réservations du compte connecté, relues quand le compte change (connexion, déconnexion).
// `loaded` est vrai sans session (rien à lire) ou une fois les réservations du compte lues
export const useMyReservations = () => {
  const authHydrated = useAuthHydrated();
  const accountId = useAuthStore(selectCurrentAccountId);
  const loadedFor = useReservationStore((s) => s.accountId);
  const reservations = useReservationStore((s) => s.reservations);
  const loadError = useReservationStore((s) => s.loadError);
  const current = !!accountId && loadedFor === accountId;

  useEffect(() => {
    if (accountId && loadedFor !== accountId) void useReservationStore.getState().load(accountId);
  }, [accountId, loadedFor]);

  return {
    loaded: authHydrated && (!accountId || current),
    signedIn: !!accountId,
    reservations: current ? reservations : [],
    loadError: current ? loadError : undefined,
    reload: () => (accountId ? useReservationStore.getState().load(accountId) : Promise.resolve()),
  };
};

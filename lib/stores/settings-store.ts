import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BookingRules, ClosedDate, DayHours, Schedule } from "@/lib/reservations";
import { createHydrationHook } from "./hydration";

export type SalonInfo = {
  address: string;
  phone: string;
  email: string;
};

type SettingsState = Schedule & {
  salon: SalonInfo;
  setRules: (rules: BookingRules) => void;
  setDay: (weekday: number, hours: DayHours) => void;
  setSlotFormat: (slotMinutes: number, slotCapacity: number) => void;
  addClosedDate: (closedDate: ClosedDate) => void;
  removeClosedDate: (date: string) => void;
  setSalon: (salon: SalonInfo) => void;
  reset: () => void;
};

const weekday = (opening: string, closing: string): DayHours => ({
  open: true,
  opening,
  closing,
  breakStart: "13:00",
  breakEnd: "14:00",
});

// Valeurs de départ : horaires affichés dans le pied de page, créneaux de 2 h, 2 places
export const defaultSettings: Schedule & { salon: SalonInfo } = {
  rules: { cancellationNoticeDays: 2, bookingWindowDays: 30, minNoticeHours: 12 },
  week: [
    { open: false, opening: "09:00", closing: "17:00" },
    weekday("09:00", "19:00"),
    weekday("09:00", "19:00"),
    weekday("09:00", "19:00"),
    weekday("09:00", "19:00"),
    weekday("09:00", "19:00"),
    weekday("09:00", "17:00"),
  ],
  slotMinutes: 120,
  slotCapacity: 2,
  closedDates: [],
  salon: {
    address: "Adresse du salon",
    phone: "+225 00 00 00 00 44",
    email: "contact@rodiq.com",
  },
};

// Réglages du salon modifiés depuis l'admin et lus par le site (créneaux, horaires, contact).
// Maquette : conservés dans le navigateur en attendant l'API.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setRules: (rules) => set({ rules }),
      setDay: (index, hours) => set((s) => ({ week: s.week.map((d, i) => (i === index ? hours : d)) })),
      setSlotFormat: (slotMinutes, slotCapacity) => set({ slotMinutes, slotCapacity }),
      addClosedDate: (closedDate) =>
        set((s) => ({
          closedDates: [...s.closedDates.filter((d) => d.date !== closedDate.date), closedDate].toSorted(
            (a, b) => a.date.localeCompare(b.date),
          ),
        })),
      removeClosedDate: (date) => set((s) => ({ closedDates: s.closedDates.filter((d) => d.date !== date) })),
      setSalon: (salon) => set({ salon }),
      reset: () => set(defaultSettings),
    }),
    {
      name: "rodiq-settings",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export const selectSchedule = ({ rules, week, slotMinutes, slotCapacity, closedDates }: SettingsState): Schedule => ({
  rules,
  week,
  slotMinutes,
  slotCapacity,
  closedDates,
});

// Vrai une fois les réglages relus depuis le localStorage
export const useSettingsHydrated = createHydrationHook(useSettingsStore);

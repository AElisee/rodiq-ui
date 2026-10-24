import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { deliveryZones, shippingDestinations, type ShippingRate } from "@/lib/commandes";
import type { BookingRules, ClosedDate, DayHours, Schedule } from "@/lib/reservations";
import { createHydrationHook } from "./hydration";

export type SalonInfo = {
  address: string;
};

export type GeoPoint = { lat: number; lng: number };

// Variantes du logo : « principal » sur fond clair, « clair » sur fond sombre, « icône » carrée
export type LogoVariant = "principal" | "clair" | "icone";

export type PlatformInfo = {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  whatsapp: string;
  socials: { instagram: string; facebook: string; tiktok: string };
  // Images en data URL (maquette : pas encore de stockage de fichiers)
  logos: Partial<Record<LogoVariant, string>>;
};

// Livraison à domicile dans Abidjan et expédition vers les autres villes
export type ShippingSettings = {
  delivery: ShippingRate[];
  expedition: ShippingRate[];
};

type SettingsState = Schedule & {
  shipping: ShippingSettings;
  platform: PlatformInfo;
  salon: SalonInfo;
  location: GeoPoint;
  setRules: (rules: BookingRules) => void;
  setDay: (weekday: number, hours: DayHours) => void;
  setSlotFormat: (slotMinutes: number, slotCapacity: number | null) => void;
  addClosedDate: (closedDate: ClosedDate) => void;
  removeClosedDate: (date: string) => void;
  setPlatform: (platform: Omit<PlatformInfo, "logos">) => void;
  setLogo: (variant: LogoVariant, dataUrl: string | undefined) => void;
  setSalon: (salon: SalonInfo) => void;
  setLocation: (location: GeoPoint) => void;
  setShipping: (shipping: ShippingSettings) => void;
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
export const defaultSettings: Schedule & {
  platform: PlatformInfo;
  salon: SalonInfo;
  location: GeoPoint;
  shipping: ShippingSettings;
} = {
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
  platform: {
    name: "Rodiq",
    tagline: "« Ne pas cacher. Prendre soin. »",
    email: "contact@rodiq.com",
    phone: "+225 00 00 00 00 44",
    phoneSecondary: "",
    whatsapp: "",
    socials: {
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
      tiktok: "https://tiktok.com",
    },
    logos: {},
  },
  salon: {
    address: "Adresse du salon",
  },
  // Abidjan, en attendant la position réelle du salon
  location: { lat: 5.36, lng: -4.0083 },
  shipping: { delivery: deliveryZones, expedition: shippingDestinations },
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
      setPlatform: (platform) => set((s) => ({ platform: { ...platform, logos: s.platform.logos } })),
      setLogo: (variant, dataUrl) =>
        set((s) => ({ platform: { ...s.platform, logos: { ...s.platform.logos, [variant]: dataUrl } } })),
      setSalon: (salon) => set({ salon }),
      setLocation: (location) => set({ location }),
      setShipping: (shipping) => set({ shipping }),
      reset: () => set(defaultSettings),
    }),
    {
      name: "rodiq-settings",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 1,
      // v0 : téléphone et e-mail étaient rangés avec l'adresse du salon
      migrate: (persisted, version) => {
        const state = persisted as Partial<SettingsState> & { salon?: { address: string; phone?: string; email?: string } };
        if (version === 0 && state.salon) {
          const { address, phone, email } = state.salon;
          state.salon = { address };
          state.platform = {
            ...defaultSettings.platform,
            phone: phone ?? defaultSettings.platform.phone,
            email: email ?? defaultSettings.platform.email,
          };
        }
        return state as SettingsState;
      },
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

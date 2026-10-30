import { create } from "zustand";
import { isApiError } from "@/lib/api/client";
import { parametresApi } from "@/lib/api/parametres";
import { deliveryZones, shippingDestinations, type ShippingRate } from "@/lib/commandes";
import type { BookingRules, ClosedDate, DayHours, Schedule } from "@/lib/reservations";
import { useAdminStore } from "./admin-store";
import { createLoadHook } from "./remote";
import { readSnapshot, writeSnapshot } from "./snapshot";

const SNAPSHOT_KEY = "parametres";

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
  // Images en data URL, stockées telles quelles par l'API (500 Ko maximum)
  logos: Partial<Record<LogoVariant, string>>;
};

// Livraison à domicile dans Abidjan et expédition vers les autres villes
export type ShippingSettings = {
  delivery: ShippingRate[];
  expedition: ShippingRate[];
};

// Tous les réglages, tels que lus par le site (même forme que la réponse de GET /parametres, traduite)
export type Settings = Schedule & {
  shipping: ShippingSettings;
  platform: PlatformInfo;
  salon: SalonInfo;
  location: GeoPoint;
};

// Actions de l'admin : chacune enregistre un onglet côté API puis reprend les réglages renvoyés.
// En cas d'échec, l'ApiError est levée (le composant affiche le message) et l'état ne change pas.
type SettingsState = Settings & {
  // Vrai une fois les réglages lus depuis l'API (ou l'échec constaté : le site garde alors les valeurs par défaut)
  loaded: boolean;
  // Faux tant que l'admin n'a pas fait la première configuration (GET /parametres en 404)
  configured: boolean;
  load: () => Promise<void>;
  configure: () => Promise<void>;
  setRules: (rules: BookingRules) => Promise<void>;
  setHours: (week: DayHours[], slotMinutes: number, slotCapacity: number | null) => Promise<void>;
  addClosedDate: (closedDate: ClosedDate) => Promise<void>;
  removeClosedDate: (date: string) => Promise<void>;
  setPlatform: (platform: Omit<PlatformInfo, "logos">) => Promise<void>;
  setLogo: (variant: LogoVariant, dataUrl: string | undefined) => Promise<void>;
  setSalon: (salon: SalonInfo, location: GeoPoint) => Promise<void>;
  setShipping: (shipping: ShippingSettings) => Promise<void>;
};

const weekday = (opening: string, closing: string): DayHours => ({
  open: true,
  opening,
  closing,
  breakStart: "13:00",
  breakEnd: "14:00",
});

// Valeurs de départ : horaires affichés dans le pied de page, créneaux de 2 h, 2 places
export const defaultSettings: Settings = {
  rules: { cancellationNoticeHours: 48, bookingWindowDays: 30, minNoticeHours: 12 },
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
// Source : l'API (`lib/api/parametres.ts`) ; les valeurs par défaut servent tant que le salon n'est pas configuré.
export const useSettingsStore = create<SettingsState>()((set, get) => {
  // Écriture admin : remplace l'état par les réglages renvoyés ; session expirée → retour à la connexion
  const save = async (request: () => Promise<Settings>) => {
    try {
      set({ ...(await request()), configured: true });
    } catch (error) {
      if (isApiError(error, 401)) useAdminStore.getState().expire();
      throw error;
    }
  };

  return {
    ...defaultSettings,
    loaded: false,
    configured: false,
    load: async () => {
      // Copie de la visite précédente affichée tout de suite, en attendant l'API
      const snapshot = get().loaded ? undefined : readSnapshot<Settings>(SNAPSHOT_KEY);
      if (snapshot) set({ ...snapshot, configured: true, loaded: true });
      try {
        const settings = await parametresApi.get();
        set({ ...settings, configured: true, loaded: true });
        writeSnapshot(SNAPSHOT_KEY, settings);
      } catch (error) {
        // 404 : salon pas encore configuré ; autre erreur : on garde la copie ou les valeurs par défaut
        if (isApiError(error, 404)) {
          set({ ...defaultSettings, configured: false });
          writeSnapshot(SNAPSHOT_KEY, null);
        } else console.error("Lecture des réglages impossible", error);
        set({ loaded: true });
      }
    },
    configure: () => save(() => parametresApi.create(get())),
    setRules: (rules) => save(() => parametresApi.setRules(rules)),
    setHours: (week, slotMinutes, slotCapacity) =>
      save(() => parametresApi.setHours(week, slotMinutes, slotCapacity)),
    addClosedDate: (closedDate) => save(() => parametresApi.addClosedDate(closedDate)),
    removeClosedDate: (date) => save(() => parametresApi.removeClosedDate(date)),
    setPlatform: (platform) => save(() => parametresApi.setPlatform(platform)),
    setLogo: (variant, dataUrl) =>
      save(() => (dataUrl ? parametresApi.setLogo(variant, dataUrl) : parametresApi.removeLogo(variant))),
    setSalon: (salon, location) => save(() => parametresApi.setSalon(salon, location)),
    setShipping: (shipping) => save(() => parametresApi.setShipping(shipping)),
  };
});

export const selectSchedule = ({ rules, week, slotMinutes, slotCapacity, closedDates }: SettingsState): Schedule => ({
  rules,
  week,
  slotMinutes,
  slotCapacity,
  closedDates,
});

// Vrai une fois les réglages lus depuis l'API
export const useSettingsHydrated = createLoadHook(
  useSettingsStore,
  (s) => s.loaded,
  () => useSettingsStore.getState().load(),
);

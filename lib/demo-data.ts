import { addDays, format, startOfDay } from "date-fns";
import { prestationCategories } from "@/lib/prestations";
import { daySlotTimes, type Reservation, type ReservationStatus } from "@/lib/reservations";
import type { Account } from "@/lib/stores/auth-store";
import { defaultSettings } from "@/lib/stores/settings-store";

// ---------------------------------------------------------------------------
// Maquette : clientes, réservations et visites de démonstration pour l'admin,
// en attendant l'API. Générées de façon stable (même graine → mêmes données).
// ---------------------------------------------------------------------------

// Générateur pseudo-aléatoire déterministe (mulberry32)
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
};

// Même mot de passe que le compte de démonstration (rodiq2026)
const DEMO_PASSWORD_HASH = "6feafd144aeefc2dd973df73378d6a7bc5c52a5e1987517fa60059251e27ca5a";

const people = [
  ["Mariam", "Traoré", "05 12 34 56 78"],
  ["Fatou", "Bamba", "07 23 45 67 89"],
  ["Adjoua", "N'Guessan", "01 34 56 78 90"],
  ["Christelle", "Yao", "07 45 67 89 01"],
  ["Awa", "Ouattara", "05 56 78 90 12"],
  ["Grâce", "Kouassi", "07 67 89 01 23"],
  ["Nadège", "Diabaté", "01 78 90 12 34"],
  ["Salimata", "Coulibaly", "05 89 01 23 45"],
] as const;

const slug = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z]/gi, "").toLowerCase();

export const demoClientAccounts: Account[] = people.map(([firstName, lastName, phone], i) => ({
  id: `demo-client-${i + 1}`,
  firstName,
  lastName,
  phone: `+225 ${phone}`,
  email: `${slug(firstName)}.${slug(lastName)}@exemple.ci`,
  passwordHash: DEMO_PASSWORD_HASH,
  createdAt: addDays(new Date(), -100 + i * 11).toISOString(),
}));

const prestationIds = prestationCategories.flatMap((c) => c.prestations.map((p) => p.id));

const pastStatus = (r: number): ReservationStatus =>
  r < 0.75 ? "terminee" : r < 0.88 ? "annulee" : "refusee";
const futureStatus = (r: number): ReservationStatus => (r < 0.55 ? "confirmee" : "en_attente");

const rejectionReasons = [
  "Le créneau n'est plus disponible : merci d'en choisir un autre.",
  "Cette prestation demande plus de temps : appelez-nous pour réserver deux créneaux.",
];

// Réservations des autres clientes, du passé (90 jours) aux 3 prochaines semaines
export const generateDemoReservations = (now = new Date()): Reservation[] => {
  const random = seeded(2026);
  const today = startOfDay(now);
  const reservations: Reservation[] = [];

  for (let offset = -90; offset <= 21; offset++) {
    const day = addDays(today, offset);
    const date = format(day, "yyyy-MM-dd");
    const times = daySlotTimes(defaultSettings.week[day.getDay()], defaultSettings.slotMinutes);

    for (const { start, end } of times) {
      // Une place sur deux est prise en moyenne, jamais plus que la capacité
      const count = Math.floor(random() * (defaultSettings.slotCapacity + 0.6));
      for (let n = 0; n < Math.min(count, defaultSettings.slotCapacity); n++) {
        const account = demoClientAccounts[Math.floor(random() * demoClientAccounts.length)];
        const status = offset < 0 ? pastStatus(random()) : futureStatus(random());
        const picked = [prestationIds[Math.floor(random() * prestationIds.length)]];
        if (random() < 0.3) picked.push(prestationIds[Math.floor(random() * prestationIds.length)]);

        reservations.push({
          id: `seed-${date}-${start}-${n}`,
          reference: `RDQ-${Math.floor(random() * 0xffffff).toString(36).toUpperCase().padStart(6, "X")}`,
          prestationIds: [...new Set(picked)],
          slotId: `${date}_${start}`,
          date,
          start,
          end,
          client: {
            firstName: account.firstName,
            lastName: account.lastName,
            phone: account.phone,
            email: account.email,
            contactChannel: random() < 0.6 ? "whatsapp" : "appel",
          },
          status,
          rejectionReason:
            status === "refusee" ? rejectionReasons[Math.floor(random() * rejectionReasons.length)] : undefined,
          accountRequested: false,
          accountId: account.id,
          createdAt: addDays(day, -1 - Math.floor(random() * 6)).toISOString(),
        });
      }
    }
  }
  return reservations;
};

// Visites des 365 derniers jours : plus de monde en fin de semaine, légère progression
export const generateDemoVisits = (now = new Date()): Record<string, number> => {
  const random = seeded(44);
  const today = startOfDay(now);
  const visits: Record<string, number> = {};

  for (let offset = -365; offset <= 0; offset++) {
    const day = addDays(today, offset);
    const weekly = [0.7, 0.9, 0.95, 1, 1.05, 1.25, 1.35][day.getDay()];
    const trend = 1 + (offset + 365) / 365;
    // Aujourd'hui : journée entamée, environ la moitié des visites
    const share = offset === 0 ? 0.5 : 1;
    visits[format(day, "yyyy-MM-dd")] = Math.round((22 + random() * 18) * weekly * trend * share);
  }
  return visits;
};

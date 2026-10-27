import { addDays, format, startOfDay } from "date-fns";
import type { Account } from "@/lib/stores/auth-store";

// ---------------------------------------------------------------------------
// Maquette : clientes et visites de démonstration pour l'admin,
// en attendant l'API. Générées de façon stable (même graine → mêmes données).
// ---------------------------------------------------------------------------

// Générateur pseudo-aléatoire déterministe (mulberry32)
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
};

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
  createdAt: addDays(new Date(), -100 + i * 11).toISOString(),
}));

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

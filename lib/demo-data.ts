import { addDays, format, startOfDay } from "date-fns";
import { deliveryZones, type Order, type OrderLine, type OrderStatus } from "@/lib/commandes";
import { allPrestations } from "@/lib/prestations";
import { products } from "@/lib/produits";
import { daySlotTimes, toReservationLines, type Reservation, type ReservationStatus } from "@/lib/reservations";
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
    // Capacité illimitée : on simule comme pour 2 places
    const capacity = defaultSettings.slotCapacity ?? 2;

    for (const { start, end } of times) {
      // Une place sur deux est prise en moyenne, jamais plus que la capacité
      const count = Math.floor(random() * (capacity + 0.6));
      for (let n = 0; n < Math.min(count, capacity); n++) {
        const account = demoClientAccounts[Math.floor(random() * demoClientAccounts.length)];
        const status = offset < 0 ? pastStatus(random()) : futureStatus(random());
        const picked = [allPrestations[Math.floor(random() * allPrestations.length)]];
        if (random() < 0.3) picked.push(allPrestations[Math.floor(random() * allPrestations.length)]);
        const prestations = [...new Set(picked)];

        reservations.push({
          id: `seed-${date}-${start}-${n}`,
          reference: `RDQ-${Math.floor(random() * 0xffffff).toString(36).toUpperCase().padStart(6, "X")}`,
          prestationIds: prestations.map((p) => p.id),
          lines: toReservationLines(prestations),
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

const streets = ["Rue des Jardins", "Boulevard Latrille", "Rue du Commerce", "Allée des Flamboyants", "Rue Pierre et Marie Curie"];

const orderNotes = ["Merci d'appeler avant de passer.", "Paquet cadeau si possible.", "Disponible après 17h."];

const cancellationReasons = [
  "Produit en rupture de stock : commande remboursée.",
  "Annulée à la demande du client ou de la cliente.",
  "Injoignable pour confirmer la livraison.",
];

// Statut selon l'ancienneté de la commande (en jours)
const orderStatus = (age: number, r: number): OrderStatus => {
  if (age >= 7) return r < 0.88 ? "livree" : "annulee";
  if (age >= 3) return r < 0.55 ? "livree" : r < 0.8 ? "prete" : r < 0.93 ? "en_preparation" : "annulee";
  if (age >= 1) return r < 0.35 ? "prete" : r < 0.75 ? "en_preparation" : "en_attente";
  return r < 0.7 ? "en_attente" : "en_preparation";
};

// Commandes de la boutique sur les 90 derniers jours, certaines passées sans compte client
export const generateDemoOrders = (now = new Date()): Order[] => {
  const random = seeded(77);
  const today = startOfDay(now);
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
  const orders: Order[] = [];

  for (let age = 90; age >= 0; age--) {
    const day = addDays(today, -age);
    const count = Math.floor(random() * 3.2);

    for (let n = 0; n < count; n++) {
      const guest = random() < 0.3;
      const account = pick(demoClientAccounts);
      const lines: OrderLine[] = [];
      for (let i = 0, total = 1 + Math.floor(random() * 3); i < total; i++) {
        const product = pick(products.filter((p) => !p.soldOut));
        if (lines.some((l) => l.productId === product.id)) continue;
        lines.push({
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: random() < 0.8 ? 1 : 2,
        });
      }

      const pickup = random() < 0.35;
      const { place: commune, fee } = pick(deliveryZones);
      const paymentMethod = random() < 0.6 ? "mobile_money" : "especes";
      const status = orderStatus(age, random());
      const createdAt = new Date(day.getTime() + (8 + random() * 12) * 3_600_000);

      orders.push({
        id: `seed-order-${format(day, "yyyy-MM-dd")}-${n}`,
        reference: `CMD-${Math.floor(random() * 0xffffff).toString(36).toUpperCase().padStart(6, "X")}`,
        lines,
        customer: guest
          ? { firstName: account.firstName, lastName: account.lastName, phone: account.phone }
          : { firstName: account.firstName, lastName: account.lastName, phone: account.phone, email: account.email },
        delivery: pickup
          ? { mode: "retrait" }
          : { mode: "livraison", commune, address: `${pick(streets)}, ${commune}` },
        deliveryFee: pickup ? 0 : fee,
        paymentMethod,
        // Mobile Money : payé à la commande ; espèces : encaissé à la remise
        paid: paymentMethod === "mobile_money" ? status !== "annulee" || random() < 0.5 : status === "livree",
        note: random() < 0.15 ? pick(orderNotes) : undefined,
        status,
        cancellationReason: status === "annulee" ? pick(cancellationReasons) : undefined,
        accountId: guest ? undefined : account.id,
        createdAt: createdAt.toISOString(),
        updatedAt: status === "en_attente" ? undefined : addDays(createdAt, Math.min(age, 2)).toISOString(),
      });
    }
  }
  return orders.reverse();
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

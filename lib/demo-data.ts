import { addDays, format, startOfDay } from "date-fns";
import { deliveryZones, type Order, type OrderLine, type OrderStatus } from "@/lib/commandes";
import type { Account } from "@/lib/stores/auth-store";

// ---------------------------------------------------------------------------
// Maquette : clientes, commandes et visites de démonstration pour l'admin,
// en attendant l'API. Générées de façon stable (même graine → mêmes données).
// ---------------------------------------------------------------------------

// Générateur pseudo-aléatoire déterministe (mulberry32)
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
};

// Articles des commandes de démonstration (le catalogue réel vient de l'API : ces identifiants n'y existent pas)
const demoProducts = [
  { id: "vernis-nude-rose", name: "Vernis nude rosé", price: 6000 },
  { id: "vernis-rouge-cerise", name: "Vernis rouge cerise", price: 6000 },
  { id: "base-top-coat", name: "Base & top coat 2-en-1", price: 8000 },
  { id: "huile-cuticules", name: "Huile pour cuticules", price: 9000 },
  { id: "elixir-fortifiant", name: "Élixir fortifiant", price: 10000 },
  { id: "creme-mains-karite", name: "Crème mains au karité", price: 7000 },
  { id: "gommage-pieds", name: "Gommage pieds", price: 8500 },
  { id: "serum-croissance", name: "Sérum croissance des ongles", price: 12000 },
  { id: "lime-verre", name: "Lime en verre", price: 4500 },
  { id: "trousse-manucure", name: "Trousse manucure complète", price: 15000 },
] as const;

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
        const product = pick(demoProducts);
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

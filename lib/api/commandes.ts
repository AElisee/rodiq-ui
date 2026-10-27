import type { DeliveryMode, Order, OrderStatus, PaymentMethod } from "@/lib/commandes";
import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

// Commandes de la boutique. L'API parle français (`lignes`, `prixUnitaire`, `motifAnnulation`…), le front
// garde ses noms : la traduction dans les deux sens est faite ici seulement.

type CommandeDto = {
  id: string;
  reference: string;
  statut: OrderStatus;
  lignes: {
    produitId: string;
    declinaisonId: string | null;
    nom: string;
    declinaison: string | null;
    prixUnitaire: number;
    quantite: number;
  }[];
  sousTotal: number;
  fraisLivraison: number;
  total: number;
  mode: DeliveryMode;
  destination: string | null;
  adresse: string | null;
  modePaiement: PaymentMethod;
  payee: boolean;
  contact: { prenom: string; nom: string; telephone: string; whatsapp: string | null; email: string };
  note: string;
  annuleePar: "cliente" | "salon" | null;
  motifAnnulation: string | null;
  creeLe: string;
  traiteeLe: string | null;
  // Vue du client ou de la cliente
  annulable?: boolean;
  // Vue de l'admin
  compteId?: string;
  payeeLe?: string | null;
};

type PageDto = {
  elements: CommandeDto[];
  total: number;
  page: number;
  parPage: number;
  parStatut: Record<OrderStatus, number>;
};

// Commande du compte connecté : coordonnées tirées du compte, prix du catalogue, frais des réglages.
// `expectedTotal` est le total affiché : s'il a changé côté serveur, la commande est refusée (409)
export type NewOrder = {
  lines: { productId: string; variantId?: string; quantity: number }[];
  mode: DeliveryMode;
  commune?: string;
  address?: string;
  paymentMethod: PaymentMethod;
  expectedTotal: number;
  note?: string;
};

export type OrdersSort = "recentes" | "anciennes" | "total-desc" | "nom";

// Filtres de l'écran Commandes de l'admin
export type OrdersQuery = {
  status: OrderStatus | null;
  payment: "payees" | "a-encaisser" | null;
  mode: DeliveryMode | null;
  search: string;
  sort: OrdersSort;
  page: number;
  pageSize: number;
};

export type OrdersPage = {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  // Commandes de chaque statut avec les autres filtres (compteurs du filtre de statut)
  countByStatus: Record<OrderStatus, number>;
};

const c = endpoints.commandes;

// Taille de page maximale acceptée par l'API
const MAX_PAGE_SIZE = 100;

const fromDto = (o: CommandeDto): Order => ({
  id: o.id,
  reference: o.reference,
  lines: o.lignes.map((line) => ({
    productId: line.produitId,
    variantId: line.declinaisonId ?? undefined,
    name: line.nom,
    variantName: line.declinaison ?? undefined,
    unitPrice: line.prixUnitaire,
    quantity: line.quantite,
  })),
  customer: {
    firstName: o.contact.prenom,
    lastName: o.contact.nom,
    phone: o.contact.telephone,
    whatsapp: o.contact.whatsapp ?? undefined,
    email: o.contact.email,
  },
  delivery: {
    mode: o.mode,
    commune: o.destination ?? undefined,
    address: o.adresse ?? undefined,
  },
  deliveryFee: o.fraisLivraison,
  paymentMethod: o.modePaiement,
  paid: o.payee,
  note: o.note || undefined,
  status: o.statut,
  cancelledBy: o.annuleePar ?? undefined,
  cancellationReason: o.motifAnnulation ?? undefined,
  createdAt: o.creeLe,
  updatedAt: o.traiteeLe ?? undefined,
  canCancel: o.annulable,
  accountId: o.compteId,
  paidAt: o.payeeLe ?? undefined,
});

const toSearchParams = ({ status, payment, mode, search, sort, page, pageSize }: OrdersQuery) => {
  const params = new URLSearchParams({ tri: sort, page: String(page), parPage: String(pageSize) });
  if (status) params.set("statut", status);
  if (payment) params.set("paiement", payment);
  if (mode) params.set("mode", mode);
  if (search.trim()) params.set("q", search.trim());
  return params;
};

const listPage = async (query: OrdersQuery): Promise<OrdersPage> => {
  const data = await apiRequest<PageDto>(`${c.liste}?${toSearchParams(query)}`);
  return {
    orders: data.elements.map(fromDto),
    total: data.total,
    page: data.page,
    pageSize: data.parPage,
    countByStatus: data.parStatut,
  };
};

const one = async (path: string, body?: unknown) =>
  fromDto(await apiRequest<CommandeDto>(path, { method: "POST", body }));

export const commandesApi = {
  // Client(e) connecté(e)
  create: ({ lines, mode, commune, address, paymentMethod, expectedTotal, note }: NewOrder) =>
    one(c.creation, {
      lignes: lines.map((line) => ({ produitId: line.productId, declinaisonId: line.variantId, quantite: line.quantity })),
      mode,
      destination: mode === "livraison" ? commune : undefined,
      adresse: mode === "livraison" ? address : undefined,
      modePaiement: paymentMethod,
      totalAttendu: expectedTotal,
      note: note || undefined,
    }),
  mine: async () => (await apiRequest<CommandeDto[]>(c.miennes)).map(fromDto),
  cancel: (id: string, reason?: string) => one(c.annulation(id), { motif: reason || undefined }),

  // Admin
  list: listPage,
  // Toutes les commandes correspondant aux filtres, page après page (export, tableau de bord)
  listAll: async (query: Omit<OrdersQuery, "page" | "pageSize">) => {
    const all: Order[] = [];
    for (let page = 1; ; page++) {
      const result = await listPage({ ...query, page, pageSize: MAX_PAGE_SIZE });
      all.push(...result.orders);
      if (result.orders.length < MAX_PAGE_SIZE || all.length >= result.total) return all;
    }
  },
  get: async (id: string) => fromDto(await apiRequest<CommandeDto>(c.detail(id))),
  accept: (id: string) => one(c.acceptation(id)),
  markReady: (id: string) => one(c.preparee(id)),
  deliver: (id: string) => one(c.remise(id)),
  markPaid: (id: string) => one(c.encaissement(id)),
  cancelBySalon: (id: string, reason: string) => one(c.annulationSalon(id), { motif: reason }),
};

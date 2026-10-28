import type { DeliveryMode, OrderStatus } from "@/lib/commandes";
import type { ReservationStatus } from "@/lib/reservations";
import type { Account } from "@/lib/stores/auth-store";
import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

// Écran Clientèle de l'admin, en lecture seule : comptes clients et leur activité, calculée par l'API.
// L'API parle français (`prenom`, `nombreReservations`, `depensesEstimees`…), le front garde ses noms : la
// traduction est faite ici seulement.

type CompteDto = {
  id: string;
  prenom: string;
  nom: string;
  telephone: string;
  whatsapp: string | null;
  email: string;
  creeLe: string;
  nombreReservations: number;
  dernierRendezVous: string | null;
  nombreCommandes: number;
  depensesEstimees: number;
};

type CompteDetailDto = CompteDto & {
  reservations: {
    id: string;
    reference: string;
    date: string;
    debut: string;
    fin: string;
    statut: ReservationStatus;
    total: number;
    totalAPartirDe: boolean;
  }[];
  commandes: {
    id: string;
    reference: string;
    creeLe: string;
    statut: OrderStatus;
    mode: DeliveryMode;
    payee: boolean;
    nombreArticles: number;
    total: number;
  }[];
};

type PageDto = {
  elements: CompteDto[];
  total: number;
  page: number;
  parPage: number;
};

// Compte client avec son activité (tous statuts confondus pour les nombres)
export type ClientAccount = Account & {
  reservationCount: number;
  // Date (yyyy-MM-dd) de la réservation la plus récente, à venir comprise
  lastAppointment?: string;
  orderCount: number;
  // Soins terminés + commandes remises, en FCFA
  estimatedSpend: number;
};

// Fiche d'un compte : historique complet, du plus récent au plus ancien
export type ClientAccountDetail = ClientAccount & {
  reservations: {
    id: string;
    reference: string;
    date: string;
    start: string;
    end: string;
    status: ReservationStatus;
    total: number;
    totalFrom: boolean;
  }[];
  orders: {
    id: string;
    reference: string;
    createdAt: string;
    status: OrderStatus;
    delivery: { mode: DeliveryMode };
    paid: boolean;
    itemCount: number;
    total: number;
  }[];
};

export type AccountsSort = "recentes" | "nom" | "reservations" | "commandes" | "depenses";

export type AccountsQuery = {
  search: string;
  sort: AccountsSort;
  page: number;
  pageSize: number;
};

export type AccountsPage = {
  accounts: ClientAccount[];
  total: number;
  page: number;
  pageSize: number;
};

const c = endpoints.comptes;

// Taille de page maximale acceptée par l'API
const MAX_PAGE_SIZE = 100;

const fromDto = (a: CompteDto): ClientAccount => ({
  id: a.id,
  firstName: a.prenom,
  lastName: a.nom,
  phone: a.telephone,
  whatsapp: a.whatsapp ?? undefined,
  email: a.email,
  createdAt: a.creeLe,
  reservationCount: a.nombreReservations,
  lastAppointment: a.dernierRendezVous ?? undefined,
  orderCount: a.nombreCommandes,
  estimatedSpend: a.depensesEstimees,
});

const fromDetailDto = (a: CompteDetailDto): ClientAccountDetail => ({
  ...fromDto(a),
  reservations: a.reservations.map((r) => ({
    id: r.id,
    reference: r.reference,
    date: r.date,
    start: r.debut,
    end: r.fin,
    status: r.statut,
    total: r.total,
    totalFrom: r.totalAPartirDe,
  })),
  orders: a.commandes.map((o) => ({
    id: o.id,
    reference: o.reference,
    createdAt: o.creeLe,
    status: o.statut,
    delivery: { mode: o.mode },
    paid: o.payee,
    itemCount: o.nombreArticles,
    total: o.total,
  })),
});

const listPage = async ({ search, sort, page, pageSize }: AccountsQuery): Promise<AccountsPage> => {
  const params = new URLSearchParams({ tri: sort, page: String(page), parPage: String(pageSize) });
  if (search.trim()) params.set("q", search.trim());
  const data = await apiRequest<PageDto>(`${c.liste}?${params}`);
  return {
    accounts: data.elements.map(fromDto),
    total: data.total,
    page: data.page,
    pageSize: data.parPage,
  };
};

export const comptesApi = {
  list: listPage,
  // Tous les comptes correspondant à la recherche, page après page (export)
  listAll: async (query: Omit<AccountsQuery, "page" | "pageSize">) => {
    const all: ClientAccount[] = [];
    for (let page = 1; ; page++) {
      const result = await listPage({ ...query, page, pageSize: MAX_PAGE_SIZE });
      all.push(...result.accounts);
      if (result.accounts.length < MAX_PAGE_SIZE || all.length >= result.total) return all;
    }
  },
  get: async (id: string) => fromDetailDto(await apiRequest<CompteDetailDto>(c.detail(id))),
};

import type { ContactChannel, Reservation, ReservationStatus, Slot } from "@/lib/reservations";
import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

// Réservations. L'API parle français (`debut`, `lignes`, `motifRefus`…), le front garde ses noms : la
// traduction dans les deux sens est faite ici seulement.

type CreneauDto = { date: string; debut: string; fin: string; placesRestantes: number | null };

type ReservationDto = {
  id: string;
  reference: string;
  date: string;
  debut: string;
  fin: string;
  statut: ReservationStatus;
  lignes: { prestationId: string; nom: string; prix: number; prixAPartirDe: boolean }[];
  contact: { prenom: string; nom: string; telephone: string; whatsapp: string | null; email: string };
  canalContact: ContactChannel;
  note: string;
  motifRefus: string | null;
  motifAnnulation: string | null;
  creeLe: string;
  traiteeLe: string | null;
  // Vue de la cliente
  annulable?: boolean;
  dateLimiteAnnulation?: string;
  // Vue de l'admin
  compteId?: string;
};

type PageDto = {
  elements: ReservationDto[];
  total: number;
  page: number;
  parPage: number;
  parStatut: Record<ReservationStatus, number>;
};

// Demande envoyée par la cliente connectée : ses coordonnées viennent de son compte, les prix de la carte
export type NewReservation = {
  prestationIds: string[];
  date: string;
  start: string;
  contactChannel: ContactChannel;
  note?: string;
};

export type ReservationsSort = "date-asc" | "date-desc" | "demande" | "nom";

// Filtres de l'écran Réservations de l'admin
export type ReservationsQuery = {
  status: ReservationStatus | null;
  when: "a-venir" | "passees" | "toutes";
  search: string;
  sort: ReservationsSort;
  page: number;
  pageSize: number;
};

export type ReservationsPage = {
  reservations: Reservation[];
  total: number;
  page: number;
  pageSize: number;
  // Réservations de chaque statut avec les autres filtres (compteurs du filtre de statut)
  countByStatus: Record<ReservationStatus, number>;
};

const r = endpoints.reservations;

// Taille de page maximale acceptée par l'API
const MAX_PAGE_SIZE = 100;

const slotFromDto = ({ date, debut, fin, placesRestantes }: CreneauDto): Slot => ({
  id: `${date}_${debut}`,
  date,
  start: debut,
  end: fin,
  remaining: placesRestantes,
});

const fromDto = (r: ReservationDto): Reservation => ({
  id: r.id,
  reference: r.reference,
  lines: r.lignes.map((line) => ({
    prestationId: line.prestationId,
    name: line.nom,
    price: line.prix,
    fromPrice: line.prixAPartirDe || undefined,
  })),
  date: r.date,
  start: r.debut,
  end: r.fin,
  client: {
    firstName: r.contact.prenom,
    lastName: r.contact.nom,
    phone: r.contact.telephone,
    whatsapp: r.contact.whatsapp ?? undefined,
    email: r.contact.email,
    contactChannel: r.canalContact,
  },
  note: r.note || undefined,
  status: r.statut,
  rejectionReason: r.motifRefus ?? undefined,
  cancellationReason: r.motifAnnulation ?? undefined,
  createdAt: r.creeLe,
  processedAt: r.traiteeLe ?? undefined,
  canCancel: r.annulable,
  cancellationDeadline: r.dateLimiteAnnulation,
  accountId: r.compteId,
});

const toSearchParams = ({ status, when, search, sort, page, pageSize }: ReservationsQuery) => {
  const params = new URLSearchParams({ tri: sort, page: String(page), parPage: String(pageSize) });
  if (status) params.set("statut", status);
  if (when !== "toutes") params.set("quand", when);
  if (search.trim()) params.set("q", search.trim());
  return params;
};

const listPage = async (query: ReservationsQuery): Promise<ReservationsPage> => {
  const data = await apiRequest<PageDto>(`${r.liste}?${toSearchParams(query)}`);
  return {
    reservations: data.elements.map(fromDto),
    total: data.total,
    page: data.page,
    pageSize: data.parPage,
    countByStatus: data.parStatut,
  };
};

const one = async (path: string, body?: unknown) =>
  fromDto(await apiRequest<ReservationDto>(path, { method: "POST", body }));


export const reservationsApi = {
  // Public : créneaux de la fenêtre de réservation, complets compris (remaining = 0)
  slots: async () => (await apiRequest<CreneauDto[]>(r.creneaux)).map(slotFromDto),

  // Cliente connectée
  create: ({ prestationIds, date, start, contactChannel, note }: NewReservation) =>
    one(r.creation, { prestationIds, date, debut: start, canalContact: contactChannel, note: note || undefined }),
  mine: async () => (await apiRequest<ReservationDto[]>(r.miennes)).map(fromDto),
  cancel: (id: string, reason?: string) => one(r.annulation(id), { motif: reason || undefined }),

  // Admin
  list: listPage,
  // Toutes les réservations correspondant aux filtres, page après page (export, tableau de bord)
  listAll: async (query: Omit<ReservationsQuery, "page" | "pageSize">) => {
    const all: Reservation[] = [];
    for (let page = 1; ; page++) {
      const result = await listPage({ ...query, page, pageSize: MAX_PAGE_SIZE });
      all.push(...result.reservations);
      if (result.reservations.length < MAX_PAGE_SIZE || all.length >= result.total) return all;
    }
  },
  get: async (id: string) => fromDto(await apiRequest<ReservationDto>(r.detail(id))),
  confirm: (id: string) => one(r.confirmation(id)),
  reject: (id: string, reason: string) => one(r.refus(id), { motif: reason }),
  complete: (id: string) => one(r.fin(id)),
};

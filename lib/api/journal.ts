import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

// Journal d'activité de l'admin, en lecture seule : connexions et actions qui modifient les données, écrites
// par l'API elle-même. L'API parle français (`le`, `acteur`, `cible`…), le front garde ses noms : la traduction
// est faite ici seulement.

export type JournalCategory = "connexion" | "reservation" | "commande" | "boutique" | "prestation" | "reglage";
export type JournalActorType = "client" | "admin" | "anonyme";
export type JournalResult = "succes" | "echec";

type EvenementDto = {
  id: number;
  le: string;
  categorie: JournalCategory;
  action: string;
  libelle: string;
  resultat: JournalResult;
  acteur: { type: JournalActorType; id: string | null; nom: string | null };
  cible: { type: string; id: string | null; libelle: string | null } | null;
  detail: string | null;
  ip: string | null;
  navigateur: string | null;
};

type PageDto = {
  elements: EvenementDto[];
  total: number;
  page: number;
  parPage: number;
  parCategorie: Record<JournalCategory, number>;
  jours: { jour: string; nombre: number }[];
};

export type JournalEntry = {
  id: number;
  // Date ISO, à la milliseconde
  at: string;
  category: JournalCategory;
  // Code de l'action (`reservation.refusee`…) et son libellé lisible
  action: string;
  label: string;
  result: JournalResult;
  // Nom copié au moment de l'action : « Prénom Nom », e-mail de l'admin, e-mail saisi (connexion refusée)
  actor: { type: JournalActorType; id?: string; name?: string };
  target?: { type: string; id?: string; label?: string };
  detail?: string;
  ip?: string;
  userAgent?: string;
};

export type JournalFilters = {
  category: JournalCategory | null;
  actor: JournalActorType | null;
  result: JournalResult | null;
  // yyyy-MM-dd, bornes comprises ; vide = sans borne
  from: string;
  to: string;
  search: string;
};

// Jour ayant des entrées avec les filtres (yyyy-MM-dd, heure d'Abidjan)
export type JournalDay = { day: string; count: number };

// Une page d'écran = un jour, du plus récent (page 1) au plus ancien
export type JournalDayPage = {
  // Toutes les entrées du jour affiché, de la plus récente à la plus ancienne
  entries: JournalEntry[];
  // Numéro du jour affiché dans `days` (1 = le plus récent), ramené dans les bornes
  dayNumber: number;
  days: JournalDay[];
  countByCategory: Record<JournalCategory, number>;
};

type PageQuery = JournalFilters & { day?: string; page: number; pageSize: number };

type Page = {
  entries: JournalEntry[];
  total: number;
  days: JournalDay[];
  countByCategory: Record<JournalCategory, number>;
};

// Taille de page maximale acceptée par l'API
const MAX_PAGE_SIZE = 100;

const fromDto = (e: EvenementDto): JournalEntry => ({
  id: e.id,
  at: e.le,
  category: e.categorie,
  action: e.action,
  label: e.libelle,
  result: e.resultat,
  actor: { type: e.acteur.type, id: e.acteur.id ?? undefined, name: e.acteur.nom ?? undefined },
  target: e.cible
    ? { type: e.cible.type, id: e.cible.id ?? undefined, label: e.cible.libelle ?? undefined }
    : undefined,
  detail: e.detail ?? undefined,
  ip: e.ip ?? undefined,
  userAgent: e.navigateur ?? undefined,
});

const listPage = async (query: PageQuery): Promise<Page> => {
  const params = new URLSearchParams({ page: String(query.page), parPage: String(query.pageSize) });
  if (query.category) params.set("categorie", query.category);
  if (query.actor) params.set("acteur", query.actor);
  if (query.result) params.set("resultat", query.result);
  if (query.from) params.set("du", query.from);
  if (query.to) params.set("au", query.to);
  if (query.day) params.set("jour", query.day);
  if (query.search.trim()) params.set("q", query.search.trim());
  const data = await apiRequest<PageDto>(`${endpoints.journal.liste}?${params}`);
  return {
    entries: data.elements.map(fromDto),
    total: data.total,
    days: data.jours.map((j) => ({ day: j.jour, count: j.nombre })),
    countByCategory: data.parCategorie,
  };
};

// Toutes les entrées correspondant aux filtres (et au jour), page après page
const listAll = async (query: JournalFilters & { day?: string }) => {
  const all: JournalEntry[] = [];
  for (let page = 1; ; page++) {
    const result = await listPage({ ...query, page, pageSize: MAX_PAGE_SIZE });
    all.push(...result.entries);
    if (result.entries.length < MAX_PAGE_SIZE || all.length >= result.total) return all;
  }
};

export const journalApi = {
  // Jours et compteurs d'abord (une seule entrée demandée), puis toutes les entrées du jour voulu
  listDay: async (filters: JournalFilters, dayNumber: number): Promise<JournalDayPage> => {
    const { days, countByCategory } = await listPage({ ...filters, page: 1, pageSize: 1 });
    const number = Math.min(Math.max(dayNumber, 1), Math.max(days.length, 1));
    const day = days[number - 1]?.day;
    const entries = day ? await listAll({ ...filters, day }) : [];
    return { entries, dayNumber: number, days, countByCategory };
  },
  // Export
  listAll: (filters: JournalFilters) => listAll(filters),
};

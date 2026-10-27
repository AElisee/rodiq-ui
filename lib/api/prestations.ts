import type { Prestation, PrestationCategory } from "@/lib/prestations";
import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

// Carte des prestations. L'API parle français (`nom`, `accroche`, `prix`…), le front garde ses noms : la
// traduction dans les deux sens est faite ici seulement. Chaque écriture renvoie toute la carte.

type PrestationDto = { id: string; nom: string; prix: number; prixAPartirDe: boolean; precision: string };
type CategoryDto = { id: string; nom: string; accroche: string; prestations: PrestationDto[] };

// Champs saisis dans les formulaires de l'admin (les identifiants sont générés par l'API)
export type CategoryFields = Pick<PrestationCategory, "name" | "tagline">;
export type PrestationFields = Omit<Prestation, "id">;

const fromDto = (categories: CategoryDto[]): PrestationCategory[] =>
  categories.map((c) => ({
    id: c.id,
    name: c.nom,
    tagline: c.accroche,
    prestations: c.prestations.map((p) => ({
      id: p.id,
      name: p.nom,
      price: p.prix,
      fromPrice: p.prixAPartirDe || undefined,
      note: p.precision || undefined,
    })),
  }));

const categoryToDto = ({ name, tagline }: CategoryFields) => ({ nom: name, accroche: tagline });

const prestationToDto = (categoryId: string, p: PrestationFields) => ({
  categorieId: categoryId,
  nom: p.name,
  prix: p.price,
  prixAPartirDe: !!p.fromPrice,
  precision: p.note ?? "",
});

const write = async (path: string, method: "POST" | "PUT" | "DELETE", body?: unknown) =>
  fromDto(await apiRequest<CategoryDto[]>(path, { method, body }));

const p = endpoints.prestations;

export const prestationsApi = {
  // Public : toutes les catégories (vides comprises) avec leurs prestations, dans l'ordre d'affichage
  list: async () => fromDto(await apiRequest<CategoryDto[]>(p.lecture)),

  createCategory: (fields: CategoryFields) => write(p.categories, "POST", categoryToDto(fields)),
  updateCategory: (id: string, fields: CategoryFields) => write(p.categorie(id), "PUT", categoryToDto(fields)),
  removeCategory: (id: string) => write(p.categorie(id), "DELETE"),
  orderCategories: (ids: string[]) => write(p.ordreCategories, "PUT", { ids }),

  createPrestation: (categoryId: string, fields: PrestationFields) =>
    write(p.creation, "POST", prestationToDto(categoryId, fields)),
  updatePrestation: (id: string, categoryId: string, fields: PrestationFields) =>
    write(p.prestation(id), "PUT", prestationToDto(categoryId, fields)),
  removePrestation: (id: string) => write(p.prestation(id), "DELETE"),
  orderPrestations: (categoryId: string, ids: string[]) => write(p.ordrePrestations(categoryId), "PUT", { ids }),
};

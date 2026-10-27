import type {
  AdminProduct,
  AdminProductCategory,
  CapacityUnit,
  Measure,
  Product,
  ProductCategory,
  StockAlert,
  StockLevel,
  WeightUnit,
} from "@/lib/produits";
import { apiFileUrl, apiRequest } from "./client";
import { endpoints } from "./endpoints";

// Boutique : catégories, produits et photos. L'API parle français (`nom`, `prixBarre`, `declinaisons`…), le
// front garde ses noms : la traduction dans les deux sens est faite ici seulement. Le site ne reçoit jamais
// le stock exact (`quantiteMax`, plafonnée à 10) ; l'admin le reçoit avec la `version` du produit.

type CategoryDto = { id: string; nom: string; description: string };
type AdminCategoryDto = CategoryDto & { nombreProduits: number };

type MesureDto<Unit extends string> = { valeur: number; unite: Unit } | null;

type ProductBaseDto = {
  id: string;
  categorieId: string;
  nom: string;
  prix: number;
  prixBarre: number | null;
  description: string;
  contenance: MesureDto<CapacityUnit>;
  poids: MesureDto<WeightUnit>;
  photos: string[];
};

type PublicProductDto = ProductBaseDto & {
  declinaisons: { id: string; nom: string; quantiteMax: number }[];
  quantiteMax: number;
  epuise: boolean;
};

type AdminProductDto = ProductBaseDto & {
  declinaisons: { id: string; nom: string; stock: number; niveauStock: StockLevel }[];
  stock: number;
  stockTotal: number;
  seuilStockFaible: number;
  niveauStock: StockLevel;
  masque: boolean;
  photoIds: string[];
  version: number;
  creeLe: string;
  modifieLe: string;
};

type PageDto<T> = { elements: T[]; total: number; page: number; parPage: number };

type StockAlertDto = {
  produitId: string;
  produitNom: string;
  declinaisonId: string | null;
  declinaisonNom: string | null;
  stock: number;
  niveau: Exclude<StockLevel, "ok">;
};

export type ProductsPage<P> = { products: P[]; total: number; page: number; pageSize: number };

export type ShopSort = "defaut" | "prix-asc" | "prix-desc";

// Filtres de la page /boutique
export type ShopQuery = {
  categoryId: string | null;
  search: string;
  sort: ShopSort;
  page: number;
  pageSize: number;
  // Produit à exclure (produits associés d'une fiche)
  except?: string;
};

export type AdminProductsSort = "defaut" | "nom" | "prix-asc" | "prix-desc" | "recent" | "stock";

// Filtres de l'écran Boutique › Produits
export type AdminProductsQuery = {
  categoryId: string | null;
  search: string;
  level: StockLevel | null;
  visibility: "visibles" | "masques" | null;
  sort: AdminProductsSort;
  page: number;
  pageSize: number;
};

// Champs saisis dans le formulaire produit de l'admin (identifiants générés par l'API, sauf ceux des
// déclinaisons existantes, à renvoyer pour garder leur historique)
export type ProductFields = {
  name: string;
  categoryId: string;
  price: number;
  compareAtPrice: number | null;
  description: string;
  capacity: Measure<CapacityUnit> | null;
  weight: Measure<WeightUnit> | null;
  // Vide : produit suivi par `stock`
  variants: { id?: string; name: string; stock: number }[];
  stock: number;
  lowStockThreshold: number;
  hidden: boolean;
};

export type CategoryFields = Pick<ProductCategory, "name" | "description">;

// Produit ajouté, avec les photos écartées (une phrase par photo, numéro et raison)
export type CreatedProduct = { product: AdminProduct; rejectedPhotos: string[] };

// Taille de page maximale acceptée par l'API pour la liste admin
const MAX_ADMIN_PAGE_SIZE = 100;

const fromMeasure = <Unit extends string>(m: MesureDto<Unit>): Measure<Unit> | undefined =>
  m ? { value: m.valeur, unit: m.unite } : undefined;

const toMeasure = <Unit extends string>(m: Measure<Unit> | null) => (m ? { valeur: m.value, unite: m.unit } : null);

const fromCategory = (c: CategoryDto): ProductCategory => ({ id: c.id, name: c.nom, description: c.description });

const fromAdminCategory = (c: AdminCategoryDto): AdminProductCategory => ({
  ...fromCategory(c),
  productCount: c.nombreProduits,
});

const fromBase = (p: ProductBaseDto) => ({
  id: p.id,
  name: p.nom,
  categoryId: p.categorieId,
  price: p.prix,
  compareAtPrice: p.prixBarre ?? undefined,
  description: p.description || undefined,
  capacity: fromMeasure(p.contenance),
  weight: fromMeasure(p.poids),
  images: p.photos.length ? p.photos.map(apiFileUrl) : undefined,
});

const fromPublicProduct = (p: PublicProductDto): Product => ({
  ...fromBase(p),
  variants: p.declinaisons.length
    ? p.declinaisons.map((d) => ({ id: d.id, name: d.nom, stock: d.quantiteMax }))
    : undefined,
  stock: p.declinaisons.length ? undefined : p.quantiteMax,
  soldOut: p.epuise,
});

const fromAdminProduct = (p: AdminProductDto): AdminProduct => ({
  ...fromBase(p),
  variants: p.declinaisons.map((d) => ({ id: d.id, name: d.nom, stock: d.stock, level: d.niveauStock })),
  stock: p.stock,
  totalStock: p.stockTotal,
  lowStockThreshold: p.seuilStockFaible,
  level: p.niveauStock,
  soldOut: p.stockTotal <= 0,
  hidden: p.masque,
  photoIds: p.photoIds,
  version: p.version,
  createdAt: p.creeLe,
  updatedAt: p.modifieLe,
});

const fromPage = <D, P>(data: PageDto<D>, map: (dto: D) => P): ProductsPage<P> => ({
  products: data.elements.map(map),
  total: data.total,
  page: data.page,
  pageSize: data.parPage,
});

const productToDto = (f: ProductFields) => ({
  categorieId: f.categoryId,
  nom: f.name,
  prix: f.price,
  prixBarre: f.compareAtPrice,
  description: f.description,
  contenance: toMeasure(f.capacity),
  poids: toMeasure(f.weight),
  declinaisons: f.variants.map((v) => ({ ...(v.id && { id: v.id }), nom: v.name, stock: v.stock })),
  stock: f.variants.length ? 0 : f.stock,
  seuilStockFaible: f.lowStockThreshold,
  masque: f.hidden,
});

const shopParams = ({ categoryId, search, sort, page, pageSize, except }: ShopQuery) => {
  const params = new URLSearchParams({ tri: sort, page: String(page), parPage: String(pageSize) });
  if (categoryId) params.set("categorie", categoryId);
  if (search.trim()) params.set("q", search.trim());
  if (except) params.set("sauf", except);
  return params;
};

const adminParams = ({ categoryId, search, level, visibility, sort, page, pageSize }: AdminProductsQuery) => {
  const params = new URLSearchParams({ tri: sort, page: String(page), parPage: String(pageSize) });
  if (categoryId) params.set("categorie", categoryId);
  if (search.trim()) params.set("q", search.trim());
  if (level) params.set("stock", level);
  if (visibility) params.set("visibilite", visibility);
  return params;
};

const b = endpoints.boutique;
const a = endpoints.boutique.admin;

const adminCategories = async (path: string, method: "POST" | "PUT" | "DELETE", body?: unknown) =>
  (await apiRequest<AdminCategoryDto[]>(path, { method, body })).map(fromAdminCategory);

const adminProduct = async (path: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: unknown) =>
  fromAdminProduct(await apiRequest<AdminProductDto>(path, { method, body }));

const listAdminPage = async (query: AdminProductsQuery) =>
  fromPage(await apiRequest<PageDto<AdminProductDto>>(`${a.produits}?${adminParams(query)}`), fromAdminProduct);

export const boutiqueApi = {
  // ───── Site (public) ─────

  // Catégories qui ont au moins un produit visible, dans l'ordre d'affichage
  categories: async () => (await apiRequest<CategoryDto[]>(b.categories)).map(fromCategory),
  products: async (query: ShopQuery) =>
    fromPage(await apiRequest<PageDto<PublicProductDto>>(`${b.produits}?${shopParams(query)}`), fromPublicProduct),
  // 404 si le produit n'existe pas ou est masqué
  product: async (id: string) => fromPublicProduct(await apiRequest<PublicProductDto>(b.produit(id))),

  // ───── Admin : catégories (chaque écriture renvoie toute la liste) ─────

  adminCategories: async () => (await apiRequest<AdminCategoryDto[]>(a.categories)).map(fromAdminCategory),
  createCategory: (fields: CategoryFields) =>
    adminCategories(a.categories, "POST", { nom: fields.name, description: fields.description }),
  updateCategory: (id: string, fields: CategoryFields) =>
    adminCategories(a.categorie(id), "PUT", { nom: fields.name, description: fields.description }),
  removeCategory: (id: string) => adminCategories(a.categorie(id), "DELETE"),
  orderCategories: (ids: string[]) => adminCategories(a.ordreCategories, "PUT", { ids }),

  // ───── Admin : produits ─────

  adminProducts: listAdminPage,
  // Tous les produits correspondant aux filtres, page après page (export)
  adminProductsAll: async (query: Omit<AdminProductsQuery, "page" | "pageSize">) => {
    const all: AdminProduct[] = [];
    for (let page = 1; ; page++) {
      const result = await listAdminPage({ ...query, page, pageSize: MAX_ADMIN_PAGE_SIZE });
      all.push(...result.products);
      if (all.length >= result.total || result.products.length === 0) return all;
    }
  },
  adminProduct: (id: string) => adminProduct(a.produit(id)),
  // Les photos refusées n'empêchent pas l'ajout : elles sont expliquées dans `rejectedPhotos`
  createProduct: async (fields: ProductFields, photos: string[]): Promise<CreatedProduct> => {
    const data = await apiRequest<AdminProductDto & { photosRefusees: string[] }>(a.produits, {
      method: "POST",
      body: { ...productToDto(fields), photos },
    });
    return { product: fromAdminProduct(data), rejectedPhotos: data.photosRefusees };
  },
  // `version` : celle de la fiche modifiée (409 si le produit a changé entre-temps)
  updateProduct: (id: string, fields: ProductFields, version: number) =>
    adminProduct(a.produit(id), "PUT", { ...productToDto(fields), version }),
  removeProduct: (id: string) => apiRequest<void>(a.produit(id), { method: "DELETE" }),
  addPhoto: (id: string, image: string) => adminProduct(a.photos(id), "POST", { image }),
  removePhoto: (id: string, photoId: string) => adminProduct(a.photo(id, photoId), "DELETE"),
  orderPhotos: (id: string, ids: string[]) => adminProduct(a.ordrePhotos(id), "PUT", { ids }),

  // Produits ou déclinaisons épuisés ou sous leur seuil, épuisés d'abord
  stockAlerts: async (): Promise<StockAlert[]> =>
    (await apiRequest<StockAlertDto[]>(a.alertesStock)).map((s) => ({
      productId: s.produitId,
      productName: s.produitNom,
      variantId: s.declinaisonId ?? undefined,
      variantName: s.declinaisonNom ?? undefined,
      stock: s.stock,
      level: s.niveau,
    })),
};

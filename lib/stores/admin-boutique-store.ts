import { create } from "zustand";
import { errorMessage, isApiError } from "@/lib/api/client";
import {
  type AdminProductsQuery,
  type CategoryFields,
  type CreatedProduct,
  type ProductFields,
  type ProductsPage,
  boutiqueApi,
} from "@/lib/api/boutique";
import type { AdminProduct, AdminProductCategory } from "@/lib/produits";
import { useAdminStore } from "./admin-store";
import { createLoadHook } from "./remote";
import type { ReadError } from "./shop-store";

// Boutique vue par l'admin (écrans Boutique › Produits et Boutique › Catégories, commandes). Source : l'API
// (`lib/api/boutique.ts`), filtrée et paginée côté serveur. Les actions lèvent l'ApiError en cas d'échec
// (le composant affiche le message) ; une session admin expirée renvoie à la connexion.
type AdminBoutiqueState = {
  // Catégories dans l'ordre d'affichage, avec leur nombre de produits (masqués compris)
  categories: AdminProductCategory[];
  categoriesLoaded: boolean;
  categoriesError: string | undefined;
  // Catégories affichées en boutique (au moins un produit visible) ; null si la lecture a échoué
  shownCategoryIds: string[] | null;
  loadCategories: () => Promise<void>;
  // Sans identifiant : ajout ; sinon modification du nom et de la description
  saveCategory: (fields: CategoryFields, id?: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  // Avance (-1) ou recule (+1) la catégorie dans l'ordre d'affichage
  moveCategory: (id: string, offset: -1 | 1) => Promise<void>;

  // Page affichée par l'écran Produits et les filtres qui l'ont produite
  query: AdminProductsQuery | null;
  page: ProductsPage<AdminProduct> | null;
  pageError: string | undefined;
  loadPage: (query: AdminProductsQuery) => Promise<void>;
  // Compteurs de l'en-tête (tous les produits, produits à réapprovisionner, produits masqués)
  summary: { total: number; toRestock: number; hidden: number } | null;
  loadSummary: () => Promise<void>;
  // Tous les produits correspondant aux filtres (export), sans changer l'état
  fetchMatching: (query: Omit<AdminProductsQuery, "page" | "pageSize">) => Promise<AdminProduct[]>;

  // Fiches ouvertes, par identifiant ; erreur de lecture avec son statut HTTP
  details: Record<string, AdminProduct>;
  detailErrors: Record<string, ReadError>;
  loadDetail: (id: string) => Promise<void>;
  // Photos (data URL) envoyées avec le produit ; les photos refusées n'empêchent pas l'ajout
  createProduct: (fields: ProductFields, photos: string[]) => Promise<CreatedProduct>;
  // `version` : celle de la fiche lue (refus 409 si le produit a changé entre-temps)
  updateProduct: (id: string, fields: ProductFields, version: number) => Promise<AdminProduct>;
  setHidden: (product: AdminProduct, hidden: boolean) => Promise<AdminProduct>;
  removeProduct: (id: string) => Promise<void>;
  addPhoto: (id: string, image: string) => Promise<AdminProduct>;
  removePhoto: (id: string, photoId: string) => Promise<AdminProduct>;
  // Fait de la photo le visuel principal (première de la liste)
  movePhotoFirst: (id: string, photoId: string) => Promise<AdminProduct>;
};

// Champs du formulaire tels qu'enregistrés, pour renvoyer le produit avec une seule modification
export const toProductFields = (product: AdminProduct): ProductFields => ({
  name: product.name,
  categoryId: product.categoryId,
  price: product.price,
  compareAtPrice: product.compareAtPrice ?? null,
  description: product.description ?? "",
  capacity: product.capacity ?? null,
  weight: product.weight ?? null,
  variants: product.variants.map(({ id, name, stock }) => ({ id, name, stock })),
  stock: product.stock,
  lowStockThreshold: product.lowStockThreshold,
  hidden: product.hidden,
});

const expireOn401 = (error: unknown) => {
  if (isApiError(error, 401)) useAdminStore.getState().expire();
};

// Refus qui signalent une liste affichée périmée (modifiée ailleurs entre-temps)
const isStale = (error: unknown) => isApiError(error, 400) || isApiError(error, 404) || isApiError(error, 409);

const without = <T>(record: Record<string, T>, id: string) =>
  Object.fromEntries(Object.entries(record).filter(([key]) => key !== id));

const swapped = (ids: string[], id: string, offset: -1 | 1) => {
  const index = ids.indexOf(id);
  const target = index + offset;
  if (index === -1 || target < 0 || target >= ids.length) return undefined;
  return ids.with(index, ids[target]).with(target, ids[index]);
};

let pageRequest = 0;

export const useAdminBoutiqueStore = create<AdminBoutiqueState>()((set, get) => {
  // Relit ce qui affiche des produits : une écriture change la liste, les compteurs et le nombre de
  // produits par catégorie
  const refresh = () => {
    const { query, summary, categoriesLoaded } = get();
    if (query) void get().loadPage(query);
    if (summary) void get().loadSummary();
    if (categoriesLoaded) void get().loadCategories();
  };

  // Écriture sur un produit : remplace sa fiche par celle renvoyée, puis relit les listes.
  // Refus 404 / 409 : le produit a changé ailleurs, on relit sa fiche aussi
  const write = async (id: string | undefined, request: () => Promise<AdminProduct>) => {
    try {
      const product = await request();
      set((s) => ({ details: { ...s.details, [product.id]: product } }));
      refresh();
      return product;
    } catch (error) {
      expireOn401(error);
      if (isStale(error)) {
        if (id) void get().loadDetail(id);
        refresh();
      }
      throw error;
    }
  };

  // Écriture sur les catégories : remplace la liste par celle renvoyée
  const saveCategories = async (request: () => Promise<AdminProductCategory[]>) => {
    try {
      set({ categories: await request() });
      // La boutique n'affiche que les catégories ayant un produit visible : relue à part
      void get().loadCategories();
    } catch (error) {
      expireOn401(error);
      if (isStale(error)) void get().loadCategories();
      throw error;
    }
  };

  return {
    categories: [],
    categoriesLoaded: false,
    categoriesError: undefined,
    shownCategoryIds: null,
    loadCategories: async () => {
      const [admin, shown] = await Promise.allSettled([boutiqueApi.adminCategories(), boutiqueApi.categories()]);
      if (admin.status === "rejected") {
        expireOn401(admin.reason);
        console.error("Lecture des catégories de produits impossible", admin.reason);
        set({ categoriesLoaded: true, categoriesError: errorMessage(admin.reason) });
        return;
      }
      set({
        categories: admin.value,
        categoriesLoaded: true,
        categoriesError: undefined,
        shownCategoryIds: shown.status === "fulfilled" ? shown.value.map((c) => c.id) : null,
      });
    },
    saveCategory: (fields, id) =>
      saveCategories(() => (id ? boutiqueApi.updateCategory(id, fields) : boutiqueApi.createCategory(fields))),
    removeCategory: (id) => saveCategories(() => boutiqueApi.removeCategory(id)),
    moveCategory: async (id, offset) => {
      const ids = swapped(
        get().categories.map((c) => c.id),
        id,
        offset,
      );
      if (ids) await saveCategories(() => boutiqueApi.orderCategories(ids));
    },

    query: null,
    page: null,
    pageError: undefined,
    loadPage: async (query) => {
      const request = ++pageRequest;
      set({ query });
      try {
        const page = await boutiqueApi.adminProducts(query);
        // Page devenue vide (derniers produits supprimés ou filtre resserré) : dernière page non vide
        if (page.products.length === 0 && page.total > 0 && query.page > 1) {
          if (request === pageRequest) {
            await get().loadPage({ ...query, page: Math.ceil(page.total / query.pageSize) });
          }
          return;
        }
        if (request === pageRequest) set({ page, pageError: undefined });
      } catch (error) {
        expireOn401(error);
        console.error("Lecture des produits impossible", error);
        if (request === pageRequest) set({ pageError: errorMessage(error) });
      }
    },

    summary: null,
    loadSummary: async () => {
      const count = { categoryId: null, search: "", level: null, sort: "defaut", page: 1, pageSize: 1 } as const;
      try {
        const [all, hidden, alerts] = await Promise.all([
          boutiqueApi.adminProducts({ ...count, visibility: null }),
          boutiqueApi.adminProducts({ ...count, visibility: "masques" }),
          boutiqueApi.stockAlerts(),
        ]);
        set({
          summary: {
            total: all.total,
            hidden: hidden.total,
            toRestock: new Set(alerts.map((a) => a.productId)).size,
          },
        });
      } catch (error) {
        // Compteurs seulement : la liste affiche sa propre erreur si elle échoue aussi
        expireOn401(error);
        console.error("Lecture des compteurs de la boutique impossible", error);
      }
    },
    fetchMatching: async (query) => {
      try {
        return await boutiqueApi.adminProductsAll(query);
      } catch (error) {
        expireOn401(error);
        throw error;
      }
    },

    details: {},
    detailErrors: {},
    loadDetail: async (id) => {
      try {
        const product = await boutiqueApi.adminProduct(id);
        set((s) => ({ details: { ...s.details, [id]: product }, detailErrors: without(s.detailErrors, id) }));
      } catch (error) {
        expireOn401(error);
        const readError = { status: isApiError(error) ? error.status : -1, message: errorMessage(error) };
        set((s) => ({
          details: readError.status === 404 ? without(s.details, id) : s.details,
          detailErrors: { ...s.detailErrors, [id]: readError },
        }));
      }
    },
    createProduct: async (fields, photos) => {
      let created: CreatedProduct | undefined;
      await write(undefined, async () => {
        created = await boutiqueApi.createProduct(fields, photos);
        return created.product;
      });
      return created!;
    },
    updateProduct: (id, fields, version) => write(id, () => boutiqueApi.updateProduct(id, fields, version)),
    setHidden: (product, hidden) =>
      write(product.id, () =>
        boutiqueApi.updateProduct(product.id, { ...toProductFields(product), hidden }, product.version),
      ),
    removeProduct: async (id) => {
      try {
        await boutiqueApi.removeProduct(id);
        set((s) => ({ details: without(s.details, id) }));
        refresh();
      } catch (error) {
        expireOn401(error);
        if (isStale(error)) refresh();
        throw error;
      }
    },
    addPhoto: (id, image) => write(id, () => boutiqueApi.addPhoto(id, image)),
    removePhoto: (id, photoId) => write(id, () => boutiqueApi.removePhoto(id, photoId)),
    movePhotoFirst: (id, photoId) => {
      const ids = get().details[id]?.photoIds ?? [];
      return write(id, () => boutiqueApi.orderPhotos(id, [photoId, ...ids.filter((p) => p !== photoId)]));
    },
  };
});

// Vrai une fois les catégories lues (ou l'échec constaté : voir `categoriesError`)
export const useAdminCategoriesLoaded = createLoadHook(
  useAdminBoutiqueStore,
  (s) => s.categoriesLoaded,
  () => useAdminBoutiqueStore.getState().loadCategories(),
);

export const useAdminCategories = () => {
  useAdminCategoriesLoaded();
  return useAdminBoutiqueStore((s) => s.categories);
};

// Compteurs de l'écran Produits, chargés à son premier affichage
export const useBoutiqueSummary = createLoadHook(
  useAdminBoutiqueStore,
  (s) => s.summary !== null,
  () => useAdminBoutiqueStore.getState().loadSummary(),
);

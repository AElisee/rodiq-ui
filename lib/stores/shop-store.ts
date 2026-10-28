import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { errorMessage, isApiError } from "@/lib/api/client";
import { type ProductsPage, type ShopQuery, boutiqueApi } from "@/lib/api/boutique";
import type { Product, ProductCategory } from "@/lib/produits";
import { createLoadHook } from "./remote";

// Boutique vue par le site (produits visibles seulement, stock plafonné). Source : l'API
// (`lib/api/boutique.ts`), filtrée et paginée côté serveur. L'admin a son propre store
// (`admin-boutique-store`) : ses routes renvoient le stock exact et les produits masqués.

// Erreur de lecture d'un produit, avec son statut HTTP (404 : inexistant ou masqué)
export type ReadError = { status: number; message: string };

type ShopState = {
  // Catégories qui ont au moins un produit visible, dans l'ordre choisi dans l'admin
  categories: ProductCategory[];
  categoriesLoaded: boolean;
  categoriesError: string | undefined;
  loadCategories: () => Promise<void>;
  // Page affichée par /boutique et les filtres qui l'ont produite
  query: ShopQuery | null;
  page: ProductsPage<Product> | null;
  // Filtres de la page reçue : différents de `query` pendant la lecture de nouveaux filtres
  pageQuery: ShopQuery | null;
  pageError: string | undefined;
  loadPage: (query: ShopQuery) => Promise<void>;
  // Produits lus un par un (fiche produit, panier, commande), par identifiant
  products: Record<string, Product>;
  productErrors: Record<string, ReadError>;
  loadProduct: (id: string) => Promise<void>;
  // Suggestions de la même catégorie, par produit de la fiche
  related: Record<string, Product[]>;
  loadRelated: (product: Product) => Promise<void>;
};

const RELATED_COUNT = 4;

const without = <T>(record: Record<string, T>, id: string) =>
  Object.fromEntries(Object.entries(record).filter(([key]) => key !== id));

// Numéro de la dernière lecture de page : une réponse plus ancienne (frappe rapide dans la recherche)
// n'écrase pas la plus récente
let pageRequest = 0;

export const useShopStore = create<ShopState>()((set, get) => ({
  categories: [],
  categoriesLoaded: false,
  categoriesError: undefined,
  loadCategories: async () => {
    try {
      set({ categories: await boutiqueApi.categories(), categoriesLoaded: true, categoriesError: undefined });
    } catch (error) {
      console.error("Lecture des catégories de la boutique impossible", error);
      set({ categoriesLoaded: true, categoriesError: errorMessage(error) });
    }
  },

  query: null,
  page: null,
  pageQuery: null,
  pageError: undefined,
  loadPage: async (query) => {
    const request = ++pageRequest;
    set({ query });
    try {
      const page = await boutiqueApi.products(query);
      // Page devenue vide (produits masqués entre-temps) : dernière page non vide
      if (page.products.length === 0 && page.total > 0 && query.page > 1) {
        if (request === pageRequest) {
          await get().loadPage({ ...query, page: Math.ceil(page.total / query.pageSize) });
        }
        return;
      }
      if (request === pageRequest) set({ page, pageQuery: query, pageError: undefined });
    } catch (error) {
      console.error("Lecture des produits impossible", error);
      if (request === pageRequest) set({ pageQuery: query, pageError: errorMessage(error) });
    }
  },

  products: {},
  productErrors: {},
  // Relu à chaque appel : prix et quantités disponibles ont pu changer depuis la dernière lecture
  loadProduct: async (id) => {
    try {
      const product = await boutiqueApi.product(id);
      set((s) => ({ products: { ...s.products, [id]: product }, productErrors: without(s.productErrors, id) }));
    } catch (error) {
      const readError = { status: isApiError(error) ? error.status : -1, message: errorMessage(error) };
      // Produit supprimé ou masqué : il disparaît ; autre échec : la dernière lecture reste affichée
      set((s) => ({
        products: readError.status === 404 ? without(s.products, id) : s.products,
        productErrors: { ...s.productErrors, [id]: readError },
      }));
    }
  },

  related: {},
  loadRelated: async (product) => {
    try {
      const { products } = await boutiqueApi.products({
        categoryId: product.categoryId,
        search: "",
        sort: "defaut",
        page: 1,
        pageSize: RELATED_COUNT,
        except: product.id,
      });
      set((s) => ({ related: { ...s.related, [product.id]: products } }));
    } catch (error) {
      // Suggestions seulement : la fiche reste utilisable sans elles
      console.error("Lecture des produits associés impossible", error);
    }
  },
}));

// Vrai une fois les catégories lues (ou l'échec constaté : voir `categoriesError`)
export const useShopCategoriesLoaded = createLoadHook(
  useShopStore,
  (s) => s.categoriesLoaded,
  () => useShopStore.getState().loadCategories(),
);

export const useShopCategories = () => {
  useShopCategoriesLoaded();
  return useShopStore((s) => s.categories);
};

// Un produit de la boutique, relu à l'ouverture de la fiche
export const useShopProduct = (id: string) => {
  const loadProduct = useShopStore((s) => s.loadProduct);
  const product = useShopStore((s) => s.products[id]);
  const error = useShopStore((s) => s.productErrors[id]);

  useEffect(() => {
    void loadProduct(id);
  }, [id, loadProduct]);

  return { product, error, retry: () => loadProduct(id) };
};

// Produits du panier ou d'une commande, relus à l'affichage (prix et disponibilité à jour). Un produit
// supprimé ou masqué (404) est simplement absent ; un autre échec est signalé dans `error`, pour ne
// pas présenter un panier vide à la place d'une lecture ratée
export const useShopProductsById = (ids: string[]) => {
  const key = [...new Set(ids)].toSorted().join(",");
  const loadProduct = useShopStore((s) => s.loadProduct);
  const products = useShopStore((s) => s.products);
  const errors = useShopStore((s) => s.productErrors);

  useEffect(() => {
    if (key) for (const id of key.split(",")) void loadProduct(id);
  }, [key, loadProduct]);

  return useMemo(() => {
    const list = key ? key.split(",") : [];
    const failed = list.filter((id) => !products[id] && errors[id] && errors[id].status !== 404);
    return {
      products: list.flatMap((id) => (products[id] ? [products[id]] : [])),
      // Lecture en cours pour un produit jamais lu
      pending: list.some((id) => !products[id] && !errors[id]),
      error: failed.length ? errors[failed[0]].message : undefined,
      retry: () => Promise.all(failed.map((id) => loadProduct(id))),
    };
  }, [key, products, errors, loadProduct]);
};

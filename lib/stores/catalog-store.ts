import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_STOCK,
  getProduct,
  imageSrc,
  productCategories,
  productStock,
  products,
  type CapacityUnit,
  type Measure,
  type Product,
  type ProductCategory,
  type ProductImage,
  type ProductVariant,
  type WeightUnit,
} from "@/lib/produits";
import { createHydrationHook } from "./hydration";

// Champs d'un produit du catalogue modifiables depuis l'admin
export type ProductOverride = {
  name: string;
  categoryId: string;
  price: number;
  compareAtPrice: number | null;
  description: string;
  // Absents des modifications enregistrées avant leur ajout : traités comme null
  capacity?: Measure<CapacityUnit> | null;
  weight?: Measure<WeightUnit> | null;
  hidden: boolean;
  // Vide : produit sans déclinaison, suivi par `stock`
  variants: ProductVariant[];
  stock: number;
  lowStockThreshold: number;
  // Absent : photos d'origine (lib/produits.ts) ; vide : aucune photo
  images?: ProductImage[];
};

// Produit tel qu'affiché : catalogue + modifications de l'admin, ou produit ajouté depuis l'admin (custom)
export type CatalogProduct = Product & { hidden?: boolean; custom?: boolean };

// Mouvement de stock : négatif à la commande, positif à l'annulation
export type StockChange = { productId: string; variantId?: string; quantity: number };

type CatalogState = {
  productOverrides: Record<string, ProductOverride>;
  customProducts: CatalogProduct[];
  // Produits du catalogue supprimés depuis l'admin
  removedProductIds: string[];
  // Catégories de la boutique, dans l'ordre d'affichage
  productCategories: ProductCategory[];
  // Ajoute ou modifie un produit (catalogue : enregistré comme modification ; sinon produit ajouté)
  saveProduct: (product: CatalogProduct) => void;
  // Supprime un produit (catalogue : retiré de la liste ; produit ajouté : effacé)
  removeProduct: (id: string) => void;
  // Rétablit les valeurs d'origine d'un produit du catalogue
  resetProduct: (id: string) => void;
  adjustStock: (changes: StockChange[]) => void;
  // Ajoute une catégorie de produits, ou la remplace si elle existe déjà
  saveProductCategory: (category: ProductCategory) => void;
  // Supprime une catégorie vide (l'interface empêche de supprimer une catégorie qui a des produits)
  removeProductCategory: (id: string) => void;
  // Avance (-1) ou recule (+1) la catégorie dans l'ordre d'affichage
  moveProductCategory: (id: string, offset: -1 | 1) => void;
};

// Échange l'élément avec son voisin (offset -1 : précédent, +1 : suivant) ; liste inchangée en bout de liste
const moveItem = <T extends { id: string }>(items: T[], id: string, offset: -1 | 1) => {
  const index = items.findIndex((item) => item.id === id);
  const target = index + offset;
  if (index === -1 || target < 0 || target >= items.length) return items;
  return items.with(index, items[target]).with(target, items[index]);
};

const baseStock = (product: Product) => product.stock ?? (product.soldOut ? 0 : DEFAULT_STOCK);

// Épuisé dès que le stock (de toutes les déclinaisons) est à zéro
const withSoldOut = (product: CatalogProduct): CatalogProduct => ({ ...product, soldOut: productStock(product) <= 0 });

export const applyOverride = (product: Product, override?: ProductOverride): CatalogProduct =>
  withSoldOut(
    override
      ? {
          ...product,
          name: override.name,
          categoryId: override.categoryId,
          price: override.price,
          compareAtPrice: override.compareAtPrice ?? undefined,
          description: override.description || undefined,
          capacity: override.capacity ?? undefined,
          weight: override.weight ?? undefined,
          hidden: override.hidden,
          variants: override.variants.length ? override.variants : undefined,
          stock: override.stock,
          lowStockThreshold: override.lowStockThreshold,
          ...(override.images && { images: override.images.length ? override.images : undefined }),
        }
      : {
          ...product,
          stock: baseStock(product),
          lowStockThreshold: product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
        },
  );

export const toOverride = (product: CatalogProduct): ProductOverride => ({
  name: product.name,
  categoryId: product.categoryId,
  price: product.price,
  compareAtPrice: product.compareAtPrice ?? null,
  description: product.description ?? "",
  capacity: product.capacity ?? null,
  weight: product.weight ?? null,
  hidden: !!product.hidden,
  variants: product.variants ?? [],
  stock: product.stock ?? 0,
  lowStockThreshold: product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
});

const sameImages = (a: ProductImage[] = [], b: ProductImage[] = []) =>
  a.length === b.length && a.every((image, i) => imageSrc(image) === imageSrc(b[i]));

// Applique un mouvement au stock de la déclinaison, ou du produit sans déclinaison
const moveStock = <T extends Pick<Product, "stock"> & { variants?: ProductVariant[] }>(
  product: T,
  variantId: string | undefined,
  quantity: number,
): T =>
  product.variants?.length
    ? {
        ...product,
        variants: product.variants.map((v) =>
          v.id === variantId ? { ...v, stock: Math.max(0, v.stock + quantity) } : v,
        ),
      }
    : { ...product, stock: Math.max(0, (product.stock ?? 0) + quantity) };

// Catalogue de la boutique modifié depuis l'admin et lu par le site (les prestations : `prestations-store`).
// Maquette : conservé dans le navigateur en attendant l'API.
export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      productOverrides: {},
      customProducts: [],
      removedProductIds: [],
      productCategories,
      saveProduct: (product) =>
        set((s) => {
          const base = getProduct(product.id);
          if (base) {
            const override = toOverride(product);
            // Photos d'origine inchangées : non enregistrées, elles suivent lib/produits.ts
            if (!sameImages(product.images, base.images)) override.images = product.images ?? [];
            return { productOverrides: { ...s.productOverrides, [product.id]: override } };
          }
          // « Épuisé » est recalculé à la lecture depuis le stock
          const custom: CatalogProduct = { ...product, soldOut: undefined, custom: true };
          const index = s.customProducts.findIndex((p) => p.id === product.id);
          return {
            customProducts: index === -1 ? [...s.customProducts, custom] : s.customProducts.with(index, custom),
          };
        }),
      removeProduct: (id) =>
        set((s) => {
          if (!getProduct(id)) return { customProducts: s.customProducts.filter((p) => p.id !== id) };
          return {
            removedProductIds: s.removedProductIds.includes(id) ? s.removedProductIds : [...s.removedProductIds, id],
            productOverrides: Object.fromEntries(Object.entries(s.productOverrides).filter(([key]) => key !== id)),
          };
        }),
      resetProduct: (id) =>
        set((s) => ({
          productOverrides: Object.fromEntries(Object.entries(s.productOverrides).filter(([key]) => key !== id)),
        })),
      adjustStock: (changes) =>
        set((s) => {
          const productOverrides = { ...s.productOverrides };
          let customProducts = s.customProducts;
          for (const { productId, variantId, quantity } of changes) {
            const base = getProduct(productId);
            if (base) {
              const current = productOverrides[productId] ?? toOverride(applyOverride(base));
              productOverrides[productId] = moveStock(current, variantId, quantity);
            } else {
              customProducts = customProducts.map((p) => (p.id === productId ? moveStock(p, variantId, quantity) : p));
            }
          }
          return { productOverrides, customProducts };
        }),
      saveProductCategory: (category) =>
        set((s) => {
          const index = s.productCategories.findIndex((c) => c.id === category.id);
          return {
            productCategories:
              index === -1 ? [...s.productCategories, category] : s.productCategories.with(index, category),
          };
        }),
      removeProductCategory: (id) =>
        set((s) => ({ productCategories: s.productCategories.filter((c) => c.id !== id) })),
      moveProductCategory: (id, offset) =>
        set((s) => ({ productCategories: moveItem(s.productCategories, id, offset) })),
    }),
    {
      name: "rodiq-catalog",
      // v1 : stock, seuil d'alerte, déclinaisons et catégorie modifiables ; « épuisé » déduit du stock
      // v2 : prestations déplacées vers l'API (`prestations-store`)
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Partial<CatalogState> & {
          productOverrides?: Record<string, Partial<ProductOverride> & { soldOut?: boolean }>;
          categories?: unknown;
        };
        if (version < 1) {
          state.productOverrides = Object.fromEntries(
            Object.entries(state.productOverrides ?? {}).flatMap(([id, { soldOut, ...override }]) => {
              const base = getProduct(id);
              if (!base) return [];
              const value: ProductOverride = {
                ...toOverride(applyOverride(base)),
                ...override,
                ...(soldOut !== undefined && { stock: soldOut ? 0 : baseStock(base) }),
              };
              return [[id, value]];
            }),
          );
          state.customProducts = [];
        }
        if (version < 2) delete state.categories;
        return state as CatalogState;
      },
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export const useCatalogHydrated = createHydrationHook(useCatalogStore);

// Hooks de lecture pour le site : déclenchent la relecture du catalogue sauvegardé

// Tous les produits avec les modifications de l'admin (y compris les produits masqués, hors produits supprimés)
export const useCatalogProducts = () => {
  useCatalogHydrated();
  const overrides = useCatalogStore((s) => s.productOverrides);
  const customProducts = useCatalogStore((s) => s.customProducts);
  const removedIds = useCatalogStore((s) => s.removedProductIds);
  return useMemo(
    () => [
      ...products.filter((p) => !removedIds.includes(p.id)).map((p) => applyOverride(p, overrides[p.id])),
      ...customProducts.map(withSoldOut),
    ],
    [overrides, customProducts, removedIds],
  );
};

// Catégories de la boutique avec les modifications de l'admin
export const useProductCategories = () => {
  useCatalogHydrated();
  return useCatalogStore((s) => s.productCategories);
};

// Nom des catégories par identifiant
export const useProductCategoryNames = () => {
  const categories = useProductCategories();
  return useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
};

// Produits visibles en boutique
export const useShopProducts = () => {
  const all = useCatalogProducts();
  return useMemo(() => all.filter((p) => !p.hidden), [all]);
};

// Un produit avec les modifications de l'admin (undefined s'il n'existe pas ou plus)
export const useCatalogProduct = (id: string) => {
  const all = useCatalogProducts();
  return useMemo(() => all.find((p) => p.id === id), [all, id]);
};

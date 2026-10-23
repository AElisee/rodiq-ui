import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { prestationCategories, type Prestation, type PrestationCategory } from "@/lib/prestations";
import { products, type Product } from "@/lib/produits";
import { createHydrationHook } from "./hydration";

// Champs d'un produit modifiables depuis l'admin (les photos restent dans lib/produits.ts)
export type ProductOverride = {
  name: string;
  price: number;
  compareAtPrice: number | null;
  description: string;
  soldOut: boolean;
  hidden: boolean;
};

type CatalogState = {
  categories: PrestationCategory[];
  productOverrides: Record<string, ProductOverride>;
  updateCategory: (id: string, data: Pick<PrestationCategory, "name" | "tagline">) => void;
  savePrestation: (categoryId: string, prestation: Prestation) => void;
  removePrestation: (id: string) => void;
  saveProduct: (id: string, override: ProductOverride) => void;
  resetProduct: (id: string) => void;
};

// Catalogue (prestations et boutique) modifié depuis l'admin et lu par le site.
// Maquette : conservé dans le navigateur en attendant l'API.
export const useCatalogStore = create<CatalogState>()(
  persist(
    (set) => ({
      categories: prestationCategories,
      productOverrides: {},
      updateCategory: (id, data) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...data } : c)) })),
      // Ajoute la prestation, ou la remplace si elle existe déjà (éventuellement dans une autre catégorie)
      savePrestation: (categoryId, prestation) =>
        set((s) => ({
          categories: s.categories.map((c) => {
            const others = c.prestations.filter((p) => p.id !== prestation.id);
            if (c.id !== categoryId) return { ...c, prestations: others };
            const index = c.prestations.findIndex((p) => p.id === prestation.id);
            return {
              ...c,
              prestations:
                index === -1 ? [...others, prestation] : c.prestations.with(index, prestation),
            };
          }),
        })),
      removePrestation: (id) =>
        set((s) => ({
          categories: s.categories.map((c) => ({
            ...c,
            prestations: c.prestations.filter((p) => p.id !== id),
          })),
        })),
      saveProduct: (id, override) =>
        set((s) => ({ productOverrides: { ...s.productOverrides, [id]: override } })),
      resetProduct: (id) =>
        set((s) => ({
          productOverrides: Object.fromEntries(Object.entries(s.productOverrides).filter(([key]) => key !== id)),
        })),
    }),
    {
      name: "rodiq-catalog",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export const useCatalogHydrated = createHydrationHook(useCatalogStore);

export const applyOverride = (product: Product, override?: ProductOverride): Product & { hidden?: boolean } =>
  override
    ? {
        ...product,
        name: override.name,
        price: override.price,
        compareAtPrice: override.compareAtPrice ?? undefined,
        description: override.description || undefined,
        soldOut: override.soldOut,
        hidden: override.hidden,
      }
    : product;

export const toOverride = (product: Product & { hidden?: boolean }): ProductOverride => ({
  name: product.name,
  price: product.price,
  compareAtPrice: product.compareAtPrice ?? null,
  description: product.description ?? "",
  soldOut: !!product.soldOut,
  hidden: !!product.hidden,
});

// Hooks de lecture pour le site : déclenchent la relecture du catalogue sauvegardé

export const usePrestationCategories = () => {
  useCatalogHydrated();
  return useCatalogStore((s) => s.categories);
};

export const useAllPrestations = () => {
  const categories = usePrestationCategories();
  return useMemo(() => categories.flatMap((c) => c.prestations), [categories]);
};

// Tous les produits avec les modifications de l'admin (y compris les produits masqués)
export const useCatalogProducts = () => {
  useCatalogHydrated();
  const overrides = useCatalogStore((s) => s.productOverrides);
  return useMemo(() => products.map((p) => applyOverride(p, overrides[p.id])), [overrides]);
};

// Produits visibles en boutique
export const useShopProducts = () => {
  const all = useCatalogProducts();
  return useMemo(() => all.filter((p) => !p.hidden), [all]);
};

// Un produit avec les modifications de l'admin
export const useShopProduct = (product: Product) => {
  useCatalogHydrated();
  const override = useCatalogStore((s) => s.productOverrides[product.id]);
  return useMemo(() => applyOverride(product, override), [product, override]);
};

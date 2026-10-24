import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { productStock, type Product, type ProductVariant } from "@/lib/produits";
import { createHydrationHook } from "./hydration";

export type CartItem = {
  id: string;
  // Déclinaison choisie, pour un produit qui en a
  variantId?: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  // max : stock restant, la quantité du panier ne le dépasse pas
  add: (id: string, variantId: string | undefined, quantity?: number, max?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

// Une ligne par produit et par déclinaison
export const cartLineKey = (item: Pick<CartItem, "id" | "variantId">) => `${item.id}:${item.variantId ?? ""}`;

// Panier de la boutique, conservé entre les visites.
// Hydratation manuelle (skipHydration) pour éviter un écart serveur / client.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (id, variantId, quantity = 1, max = Infinity) =>
        set((s) => {
          const key = cartLineKey({ id, variantId });
          const existing = s.items.find((item) => cartLineKey(item) === key);
          return {
            items: existing
              ? s.items.map((item) =>
                  item === existing ? { ...item, quantity: Math.min(item.quantity + quantity, max) } : item,
                )
              : [...s.items, { id, variantId, quantity: Math.min(quantity, max) }],
          };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          items: s.items.map((item) =>
            cartLineKey(item) === key ? { ...item, quantity: Math.max(1, quantity) } : item,
          ),
        })),
      remove: (key) => set((s) => ({ items: s.items.filter((item) => cartLineKey(item) !== key) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "rodiq-cart",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export const selectCartCount = (s: CartState) =>
  s.items.reduce((sum, item) => sum + item.quantity, 0);

// Quantité déjà au panier pour un produit (et une déclinaison)
export const selectCartQuantity = (id: string, variantId?: string) => (s: CartState) =>
  s.items.find((item) => cartLineKey(item) === cartLineKey({ id, variantId }))?.quantity ?? 0;

export type CartLine<P extends Product = Product> = {
  key: string;
  product: P;
  variant?: ProductVariant;
  quantity: number;
  // Stock restant de la déclinaison ou du produit
  stock: number;
};

// Lignes du panier avec leur produit ; ignore les produits (ou déclinaisons) retirés depuis l'ajout
export const resolveCartLines = <P extends Product>(items: CartItem[], products: P[]): CartLine<P>[] =>
  items.flatMap((item) => {
    const product = products.find((p) => p.id === item.id);
    if (!product) return [];
    const hasVariants = !!product.variants?.length;
    const variant = hasVariants ? product.variants!.find((v) => v.id === item.variantId) : undefined;
    // Déclinaison supprimée, ou déclinaisons ajoutées depuis l'ajout au panier
    if (hasVariants !== !!item.variantId || (hasVariants && !variant)) return [];
    return [{ key: cartLineKey(item), product, variant, quantity: item.quantity, stock: productStock(product, variant?.id) }];
  });

// Vrai une fois le panier relu depuis le localStorage (évite d'afficher « panier vide » au chargement)
export const useCartHydrated = createHydrationHook(useCartStore);

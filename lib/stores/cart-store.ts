import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createHydrationHook } from "./hydration";

type CartItem = {
  id: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (id: string, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

// Panier de la boutique, conservé entre les visites.
// Hydratation manuelle (skipHydration) pour éviter un écart serveur / client.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (id, quantity = 1) =>
        set((s) => ({
          items: s.items.some((item) => item.id === id)
            ? s.items.map((item) =>
                item.id === id ? { ...item, quantity: item.quantity + quantity } : item,
              )
            : [...s.items, { id, quantity }],
        })),
      setQuantity: (id, quantity) =>
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item,
          ),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((item) => item.id !== id) })),
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

// Vrai une fois le panier relu depuis le localStorage (évite d'afficher « panier vide » au chargement)
export const useCartHydrated = createHydrationHook(useCartStore);

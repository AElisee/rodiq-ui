import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type CartItem = {
  id: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (id: string) => void;
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
      add: (id) =>
        set((s) => ({
          items: s.items.some((item) => item.id === id)
            ? s.items.map((item) =>
                item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
              )
            : [...s.items, { id, quantity: 1 }],
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

// Côté serveur (pas de localStorage), zustand n'attache pas l'API persist
const subscribeHydration = (onChange: () => void) =>
  useCartStore.persist?.onFinishHydration(onChange) ?? (() => {});
const getHydrated = () => useCartStore.persist?.hasHydrated() ?? false;

// Vrai une fois le panier relu depuis le localStorage (évite d'afficher « panier vide » au chargement).
// Relance la lecture si personne ne l'a faite (store recréé par le Fast Refresh, header absent…)
export const useCartHydrated = () => {
  const hydrated = useSyncExternalStore(subscribeHydration, getHydrated, () => false);

  useEffect(() => {
    if (!useCartStore.persist.hasHydrated()) useCartStore.persist.rehydrate();
  }, []);

  return hydrated;
};

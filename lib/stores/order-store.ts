import { useEffect } from "react";
import { create } from "zustand";
import { errorMessage, isApiError } from "@/lib/api/client";
import { type NewOrder, commandesApi } from "@/lib/api/commandes";
import type { Order } from "@/lib/commandes";
import { selectCurrentAccountId, useAuthHydrated, useAuthStore } from "./auth-store";
import { useShopStore } from "./shop-store";

// Commandes du compte connecté. Source : l'API (`lib/api/commandes.ts`), qui retire le stock à la création
// et le rend à l'annulation. Les actions lèvent l'ApiError en cas d'échec (le composant affiche le message).
type OrderState = {
  // Commandes du compte `accountId`, la plus récente d'abord
  orders: Order[];
  // Compte dont les commandes sont chargées (null : rien de chargé)
  accountId: string | null;
  // Raison de l'échec de la dernière lecture
  loadError: string | undefined;
  load: (accountId: string) => Promise<void>;
  // Passe la commande pour le compte connecté et renvoie la commande enregistrée
  add: (order: NewOrder) => Promise<Order>;
  cancel: (id: string, reason?: string) => Promise<void>;
};

// Stock, prix et disponibilité des produits concernés ont changé (ou ont pu changer ailleurs) : on les relit
const reloadProducts = (productIds: string[]) => {
  for (const id of new Set(productIds)) void useShopStore.getState().loadProduct(id);
};

export const useOrderStore = create<OrderState>()((set, get) => {
  // Refus du serveur (stock, prix, frais ou statut changés) : la liste a pu changer ailleurs, on la relit
  const refreshAfterRefusal = (error: unknown, productIds: string[]) => {
    if (isApiError(error, 400) || isApiError(error, 404) || isApiError(error, 409)) {
      reloadProducts(productIds);
      const { accountId } = get();
      if (accountId) void get().load(accountId);
    }
  };

  return {
    orders: [],
    accountId: null,
    loadError: undefined,
    load: async (accountId) => {
      try {
        const orders = await commandesApi.mine();
        set({ orders, accountId, loadError: undefined });
      } catch (error) {
        console.error("Lecture des commandes impossible", error);
        set({ orders: [], accountId, loadError: errorMessage(error) });
      }
    },
    add: async (data) => {
      const productIds = data.lines.map((line) => line.productId);
      try {
        const order = await commandesApi.create(data);
        set((s) => ({ orders: [order, ...s.orders] }));
        reloadProducts(productIds);
        return order;
      } catch (error) {
        refreshAfterRefusal(error, productIds);
        throw error;
      }
    },
    cancel: async (id, reason) => {
      const productIds = get().orders.find((o) => o.id === id)?.lines.map((line) => line.productId) ?? [];
      try {
        const updated = await commandesApi.cancel(id, reason);
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? updated : o)) }));
        reloadProducts(productIds);
      } catch (error) {
        refreshAfterRefusal(error, productIds);
        throw error;
      }
    },
  };
});

// Commandes du compte connecté, relues quand le compte change (connexion, déconnexion).
// `loaded` est vrai sans session (rien à lire) ou une fois les commandes du compte lues
export const useMyOrders = () => {
  const authHydrated = useAuthHydrated();
  const accountId = useAuthStore(selectCurrentAccountId);
  const loadedFor = useOrderStore((s) => s.accountId);
  const orders = useOrderStore((s) => s.orders);
  const loadError = useOrderStore((s) => s.loadError);
  const current = !!accountId && loadedFor === accountId;

  useEffect(() => {
    if (accountId && loadedFor !== accountId) void useOrderStore.getState().load(accountId);
  }, [accountId, loadedFor]);

  return {
    loaded: authHydrated && (!accountId || current),
    signedIn: !!accountId,
    orders: current ? orders : [],
    loadError: current ? loadError : undefined,
    reload: () => (accountId ? useOrderStore.getState().load(accountId) : Promise.resolve()),
  };
};

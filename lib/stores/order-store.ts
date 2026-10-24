import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Order, OrderLine } from "@/lib/commandes";
import { generateDemoOrders } from "@/lib/demo-data";
import { useCatalogStore } from "./catalog-store";
import { createHydrationHook, ensureHydrated } from "./hydration";

type OrderState = {
  orders: Order[];
  add: (order: Order) => void;
  // Actions de l'admin
  accept: (id: string) => void;
  markReady: (id: string) => void;
  deliver: (id: string) => void;
  cancel: (id: string, reason: string) => void;
  markPaid: (id: string) => void;
  // Rattache à un compte les commandes passées sans compte avec cette adresse e-mail
  claim: (accountId: string, email: string) => void;
};

const update = (orders: Order[], id: string, changes: Partial<Order>) =>
  orders.map((o) => (o.id === id ? { ...o, ...changes, updatedAt: new Date().toISOString() } : o));

// Stock réservé à la commande (sign -1), rendu à l'annulation (sign 1)
const moveStock = async (lines: OrderLine[], sign: 1 | -1) => {
  await ensureHydrated(useCatalogStore);
  useCatalogStore
    .getState()
    .adjustStock(lines.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity: sign * quantity })));
};

// Commandes de la boutique traitées par l'admin (maquette : conservées dans le navigateur en attendant l'API).
// Hydratation manuelle (skipHydration) pour éviter un écart serveur / client.
export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: generateDemoOrders(),
      add: (order) => {
        set((s) => ({ orders: [order, ...s.orders] }));
        void moveStock(order.lines, -1);
      },
      accept: (id) => set((s) => ({ orders: update(s.orders, id, { status: "en_preparation" }) })),
      markReady: (id) => set((s) => ({ orders: update(s.orders, id, { status: "prete" }) })),
      // La remise vaut encaissement pour un paiement en espèces
      deliver: (id) => set((s) => ({ orders: update(s.orders, id, { status: "livree", paid: true }) })),
      cancel: (id, reason) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order || order.status === "annulee") return;
        set((s) => ({ orders: update(s.orders, id, { status: "annulee", cancellationReason: reason }) }));
        void moveStock(order.lines, 1);
      },
      markPaid: (id) => set((s) => ({ orders: update(s.orders, id, { paid: true }) })),
      claim: (accountId, email) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            !o.accountId && o.customer.email?.toLowerCase() === email ? { ...o, accountId } : o,
          ),
        })),
    }),
    {
      name: "rodiq-orders",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

// Vrai une fois les commandes relues depuis le localStorage
export const useOrdersHydrated = createHydrationHook(useOrderStore);

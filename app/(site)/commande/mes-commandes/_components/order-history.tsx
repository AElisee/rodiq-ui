"use client";

import Link from "next/link";
import { useState } from "react";
import { orderFilterLabels, type OrderStatus } from "@/lib/commandes";
import { useAuthHydrated, useAuthStore } from "@/lib/stores/auth-store";
import { useOrderStore, useOrdersHydrated } from "@/lib/stores/order-store";
import { cn } from "@/lib/utils";
import { OrderCard } from "./order-card";

const filters: { value: OrderStatus | null; label: string }[] = [
  { value: null, label: "Toutes" },
  ...(Object.keys(orderFilterLabels) as OrderStatus[]).map((value) => ({
    value,
    label: orderFilterLabels[value],
  })),
];

// Historique des commandes de la boutique, filtrable par statut
export const OrderHistory = () => {
  const hydrated = useOrdersHydrated();
  const authHydrated = useAuthHydrated();
  const accountId = useAuthStore((s) => s.currentAccountId);
  const allOrders = useOrderStore((s) => s.orders);
  const [status, setStatus] = useState<OrderStatus | null>(null);

  // Les commandes sont relues depuis le navigateur : rien à afficher côté serveur
  if (!hydrated || !authHydrated) return <div className="min-h-64" aria-hidden />;

  // Avec un compte : ses commandes ; sinon celles passées sans compte sur ce navigateur.
  // Les commandes de démonstration sans compte ne concernent pas ce navigateur.
  const orders = allOrders.filter(
    (o) => (o.accountId ?? null) === accountId && (accountId || !o.id.startsWith("seed-")),
  );

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <p className="font-serif text-[clamp(1.25rem,2vw,1.75rem)] text-cocoa">
          Vous n&apos;avez pas encore de commande.
        </p>
        <p className="mt-3 max-w-md font-serif text-[clamp(1rem,1.3vw,1.15rem)] text-taupe italic">
          Retrouvez nos soins et vernis pour prolonger l&apos;expérience RODIQ chez vous.
        </p>
        <Link
          href="/boutique"
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  const count = (value: OrderStatus | null) =>
    value ? orders.filter((o) => o.status === value).length : orders.length;

  // Commandes les plus récentes en premier
  const visible = orders
    .filter((o) => !status || o.status === status)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap justify-center gap-3">
        {filters.map((filter) => (
          <button
            key={filter.value ?? "all"}
            type="button"
            onClick={() => setStatus(filter.value)}
            aria-pressed={status === filter.value}
            className={cn(
              "rounded-full border border-sand px-5 py-2 font-sans text-sm text-cocoa transition-colors hover:bg-sand",
              status === filter.value && "bg-sand",
            )}
          >
            {filter.label} <span className="text-taupe">({count(filter.value)})</span>
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <ul className="mt-12 flex flex-col gap-6">
          {visible.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-16 text-center font-serif text-[clamp(1.1rem,1.5vw,1.35rem)] text-taupe italic">
          Aucune commande avec ce statut.
        </p>
      )}

      <div className="mt-16 flex flex-col items-center gap-4 border-t border-sand pt-12 text-center">
        <p className="font-serif text-lg text-cocoa">Envie de vous faire plaisir ?</p>
        <Link
          href="/boutique"
          className="inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Retour à la boutique
        </Link>
      </div>
    </>
  );
};

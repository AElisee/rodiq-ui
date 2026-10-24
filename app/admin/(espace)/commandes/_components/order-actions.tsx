"use client";

import { toast } from "sonner";
import { adminSmallButtonClassName } from "@/components/admin/admin-ui";
import type { Order } from "@/lib/commandes";
import { useOrderStore } from "@/lib/stores/order-store";
import { CancelOrderDialog } from "./cancel-order-dialog";

// Étape suivante du suivi selon le statut : accepter, expédier / prête au retrait, remettre, annuler
export const OrderActions = ({ order: o }: { order: Order }) => {
  const accept = useOrderStore((s) => s.accept);
  const markReady = useOrderStore((s) => s.markReady);
  const deliver = useOrderStore((s) => s.deliver);
  const pickup = o.delivery.mode === "retrait";

  const notify = (message: string) =>
    toast.success(message, { description: `${o.customer.firstName} ${o.customer.lastName} · ${o.reference}` });

  return (
    <>
      {o.status === "en_attente" && (
        <button
          type="button"
          onClick={() => {
            accept(o.id);
            notify("Commande acceptée");
          }}
          className={adminSmallButtonClassName}
        >
          Accepter
        </button>
      )}
      {o.status === "en_preparation" && (
        <button
          type="button"
          onClick={() => {
            markReady(o.id);
            notify(pickup ? "Commande prête au retrait" : "Commande expédiée");
          }}
          className={adminSmallButtonClassName}
        >
          {pickup ? "Prête au retrait" : "Expédier"}
        </button>
      )}
      {o.status === "prete" && (
        <button
          type="button"
          onClick={() => {
            deliver(o.id);
            notify(pickup ? "Commande retirée" : "Commande livrée");
          }}
          className={adminSmallButtonClassName}
        >
          {pickup ? "Marquer retirée" : "Marquer livrée"}
        </button>
      )}
      {(o.status === "en_attente" || o.status === "en_preparation") && <CancelOrderDialog order={o} />}
    </>
  );
};

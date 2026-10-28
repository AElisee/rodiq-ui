"use client";

import { useState } from "react";
import { toast } from "sonner";
import { adminSmallButtonClassName, PendingLabel } from "@/components/admin/admin-ui";
import { errorMessage } from "@/lib/api/client";
import type { Order } from "@/lib/commandes";
import { useAdminOrdersStore } from "@/lib/stores/admin-orders-store";
import { CancelOrderDialog } from "./cancel-order-dialog";

// Étape suivante du suivi selon le statut : accepter, expédier / prête au retrait, remettre, annuler
export const OrderActions = ({ order: o }: { order: Order }) => {
  const accept = useAdminOrdersStore((s) => s.accept);
  const markReady = useAdminOrdersStore((s) => s.markReady);
  const deliver = useAdminOrdersStore((s) => s.deliver);
  const [pending, setPending] = useState(false);
  const pickup = o.delivery.mode === "retrait";
  const who = `${o.customer.firstName} ${o.customer.lastName} · ${o.reference}`;

  const run = async (request: () => Promise<unknown>, success: string, failure: string) => {
    setPending(true);
    try {
      await request();
      toast.success(success, { description: who });
    } catch (error) {
      toast.error(failure, { description: errorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {o.status === "en_attente" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => accept(o.id), "Commande acceptée", `La commande ${o.reference} n'a pas été acceptée`)
          }
          className={adminSmallButtonClassName}
        >
          <PendingLabel pending={pending}>Accepter</PendingLabel>
        </button>
      )}
      {o.status === "en_preparation" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => markReady(o.id),
              pickup ? "Commande prête au retrait" : "Commande expédiée",
              `La commande ${o.reference} n'a pas été marquée ${pickup ? "prête au retrait" : "expédiée"}`,
            )
          }
          className={adminSmallButtonClassName}
        >
          <PendingLabel pending={pending}>{pickup ? "Prête au retrait" : "Expédier"}</PendingLabel>
        </button>
      )}
      {o.status === "prete" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => deliver(o.id),
              pickup ? "Commande retirée" : "Commande livrée",
              `La commande ${o.reference} n'a pas été marquée ${pickup ? "retirée" : "livrée"}`,
            )
          }
          className={adminSmallButtonClassName}
        >
          <PendingLabel pending={pending}>{pickup ? "Marquer retirée" : "Marquer livrée"}</PendingLabel>
        </button>
      )}
      {(o.status === "en_attente" || o.status === "en_preparation") && <CancelOrderDialog order={o} />}
    </>
  );
};

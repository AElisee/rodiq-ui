"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { errorMessage } from "@/lib/api/client";
import { orderTotal, type Order } from "@/lib/commandes";
import { formatPrice } from "@/lib/prestations";
import { useOrderStore } from "@/lib/stores/order-store";
import { PendingLabel } from "@/components/ui/shimmer";

// Confirmation d'annulation, avec un motif facultatif transmis au salon
export const CancelOrderDialog = ({ order }: { order: Order }) => {
  const cancel = useOrderStore((s) => s.cancel);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await cancel(order.id, reason.trim() || undefined);
      setOpen(false);
      toast("Commande annulée", { description: `Référence ${order.reference}` });
    } catch (error) {
      toast.error(`La commande ${order.reference} n'a pas été annulée`, {
        description: errorMessage(error),
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="font-sans text-sm text-cocoa underline underline-offset-4 transition-colors hover:text-taupe"
        >
          Annuler la commande
        </button>
      </DialogTrigger>

      <DialogContent className="gap-0 rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-md md:p-8">
        <DialogTitle className="font-serif text-xl leading-tight font-normal">Annuler cette commande ?</DialogTitle>
        <DialogDescription className="mt-3 text-sm text-taupe">
          Référence {order.reference} · {formatPrice(orderTotal(order))}. Les articles seront remis en vente.
          {order.paid && " Le salon vous contacte pour le remboursement du paiement déjà reçu."}
        </DialogDescription>

        <label htmlFor={`reason-${order.id}`} className="mt-6 mb-2 block text-sm">
          Motif
        </label>
        <textarea
          id={`reason-${order.id}`}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          className="w-full rounded-[var(--radius)] border border-sand bg-pearl px-5 py-3 text-base outline-none transition-colors placeholder:text-taupe focus-visible:border-taupe"
        />

        <div className="mt-8 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <button type="button" className="text-sm underline-offset-4 hover:underline">
              Garder ma commande
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-blush px-6 text-base text-cocoa transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:bg-sand disabled:text-taupe sm:w-auto"
          >
            <PendingLabel pending={pending} pendingLabel="Annulation…">
              {"Confirmer l'annulation"}
            </PendingLabel>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

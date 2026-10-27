"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  adminButtonClassName,
  adminLabelClassName,
  adminSmallOutlineButtonClassName,
  adminTextareaClassName,
} from "@/components/admin/admin-ui";
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
import { useAdminOrdersStore } from "@/lib/stores/admin-orders-store";

// Suggestions de motifs, modifiables avant l'envoi
const presetReasons = [
  "Produit en rupture de stock : commande remboursée.",
  "Annulée à la demande du client ou de la cliente.",
  "Injoignable pour confirmer la livraison.",
];

// Annulation d'une commande : le motif est obligatoire et transmis au client ou à la cliente
export const CancelOrderDialog = ({ order }: { order: Order }) => {
  const cancel = useAdminOrdersStore((s) => s.cancel);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const valid = reason.trim().length >= 5;

  const confirm = async () => {
    setPending(true);
    try {
      await cancel(order.id, reason.trim());
      setOpen(false);
      setReason("");
      toast("Commande annulée, articles remis en stock", {
        description: `${order.customer.firstName} ${order.customer.lastName} · ${order.reference}`,
      });
    } catch (error) {
      toast.error(`La commande ${order.reference} n'a pas été annulée`, { description: errorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={adminSmallOutlineButtonClassName}>
          Annuler
        </button>
      </DialogTrigger>

      <DialogContent className="gap-0 rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-lg md:p-8">
        <DialogTitle className="font-serif text-xl leading-tight font-normal">Annuler cette commande ?</DialogTitle>
        <DialogDescription className="mt-3 text-sm text-taupe">
          {order.customer.firstName} {order.customer.lastName} · {order.reference} · {formatPrice(orderTotal(order))}
          {order.paid && ". Pensez à rembourser le paiement déjà reçu."}
        </DialogDescription>

        <p className="mt-6 mb-2 text-sm">Motifs fréquents</p>
        <div className="flex flex-wrap gap-2">
          {presetReasons.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className="rounded-[var(--radius)] border border-sand px-3 py-1.5 text-left text-xs transition-colors hover:bg-sand"
            >
              {preset}
            </button>
          ))}
        </div>

        <label htmlFor={`cancel-${order.id}`} className={`mt-6 ${adminLabelClassName}`}>
          Motif transmis au client ou à la cliente *
        </label>
        <textarea
          id={`cancel-${order.id}`}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          aria-required
          className={adminTextareaClassName}
        />

        <div className="mt-8 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <button type="button" className="text-sm underline-offset-4 hover:underline">
              Retour
            </button>
          </DialogClose>
          <button type="button" onClick={confirm} disabled={!valid || pending} className={`w-full sm:w-auto ${adminButtonClassName}`}>
            Confirmer l&apos;annulation
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

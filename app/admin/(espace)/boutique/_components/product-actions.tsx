"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminButtonClassName, PendingLabel } from "@/components/admin/admin-ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { errorMessage } from "@/lib/api/client";
import type { AdminProduct } from "@/lib/produits";
import { useAdminBoutiqueStore } from "@/lib/stores/admin-boutique-store";

export const iconButtonClassName =
  "inline-flex size-8 items-center justify-center rounded-full text-taupe transition-colors hover:bg-sand hover:text-cocoa";

// Suppression d'un produit (les commandes passées gardent leurs lignes)
export const DeleteProduct = ({ product, onDeleted }: { product: AdminProduct; onDeleted?: () => void }) => {
  const removeProduct = useAdminBoutiqueStore((s) => s.removeProduct);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      await removeProduct(product.id);
      setOpen(false);
      onDeleted?.();
      toast("Produit supprimé", { description: product.name });
    } catch (error) {
      toast.error(`« ${product.name} » n'a pas été supprimé`, { description: errorMessage(error) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Supprimer ${product.name}`} title="Supprimer" className={iconButtonClassName}>
          <Trash2 className="size-4" strokeWidth={1.75} />
        </button>
      </DialogTrigger>
      <DialogContent className="gap-0 rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-md md:p-8">
        <DialogTitle className="font-serif text-xl leading-tight font-normal">Supprimer {product.name} ?</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-taupe">
          Le produit, ses photos et ses variants disparaissent de la boutique et des paniers. Les commandes déjà
          passées le conservent. Pour le retirer seulement un temps, masquez-le plutôt.
        </DialogDescription>
        <div className="mt-6 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <button type="button" className="text-sm underline-offset-4 hover:underline">
              Annuler
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={deleting}
            className={`w-full sm:w-auto ${adminButtonClassName}`}
          >
            <PendingLabel pending={deleting} pendingLabel="Suppression…">Supprimer</PendingLabel>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

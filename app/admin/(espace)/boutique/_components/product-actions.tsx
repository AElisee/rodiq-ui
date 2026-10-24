"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminButtonClassName } from "@/components/admin/admin-ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCatalogStore, type CatalogProduct } from "@/lib/stores/catalog-store";

export const iconButtonClassName =
  "inline-flex size-8 items-center justify-center rounded-full text-taupe transition-colors hover:bg-sand hover:text-cocoa";

// Suppression d'un produit (les commandes passées gardent leurs lignes)
export const DeleteProduct = ({ product, onDeleted }: { product: CatalogProduct; onDeleted?: () => void }) => {
  const removeProduct = useCatalogStore((s) => s.removeProduct);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Supprimer ${product.name}`} title="Supprimer" className={iconButtonClassName}>
          <Trash2 className="size-4" strokeWidth={1.75} />
        </button>
      </DialogTrigger>
      <DialogContent className="gap-0 rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-md md:p-8">
        <DialogTitle className="font-serif text-xl leading-tight font-normal">Supprimer {product.name} ?</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-taupe">
          Le produit disparaît de la boutique et des paniers. Les commandes déjà passées le conservent. Pour le
          retirer seulement un temps, masquez-le plutôt.
        </DialogDescription>
        <div className="mt-6 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <button type="button" className="text-sm underline-offset-4 hover:underline">
              Annuler
            </button>
          </DialogClose>
          <DialogClose asChild>
            <button
              type="button"
              onClick={() => {
                onDeleted?.();
                removeProduct(product.id);
                toast("Produit supprimé", { description: product.name });
              }}
              className={`w-full sm:w-auto ${adminButtonClassName}`}
            >
              Supprimer
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Retour aux valeurs d'origine d'un produit du catalogue modifié depuis l'admin
export const ResetProduct = ({ product, onReset }: { product: CatalogProduct; onReset?: () => void }) => {
  const resetProduct = useCatalogStore((s) => s.resetProduct);

  return (
    <button
      type="button"
      onClick={() => {
        resetProduct(product.id);
        onReset?.();
        toast("Produit rétabli", { description: "Valeurs d'origine du catalogue" });
      }}
      aria-label={`Rétablir ${product.name}`}
      title="Rétablir les valeurs d'origine (stock compris)"
      className={iconButtonClassName}
    >
      <RotateCcw className="size-4" strokeWidth={1.75} />
    </button>
  );
};

// Rétablissement (produit du catalogue modifié) et suppression
export const ProductRowActions = ({
  product,
  onDeleted,
  onReset,
}: {
  product: CatalogProduct;
  onDeleted?: () => void;
  onReset?: () => void;
}) => {
  const overridden = useCatalogStore((s) => !product.custom && !!s.productOverrides[product.id]);
  return (
    <>
      {overridden && <ResetProduct product={product} onReset={onReset} />}
      <DeleteProduct product={product} onDeleted={onDeleted} />
    </>
  );
};

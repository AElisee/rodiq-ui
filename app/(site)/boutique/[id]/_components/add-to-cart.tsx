"use client";

import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Product, ProductVariant } from "@/lib/produits";
import { selectCartQuantity, useCartStore } from "@/lib/stores/cart-store";

type AddToCartProps = {
  product: Product;
  variant?: ProductVariant;
  // Stock restant de la déclinaison choisie, ou du produit
  stock: number;
};

// Choix de la quantité et ajout au panier depuis la fiche produit, dans la limite du stock
export const AddToCart = ({ product, variant, stock }: AddToCartProps) => {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const inCart = useCartStore(selectCartQuantity(product.id, variant?.id));
  const [quantity, setQuantity] = useState(1);
  // Confirmation « ajouté » affichée brièvement après l'ajout
  const [added, setAdded] = useState(false);
  const available = Math.max(stock - inCart, 0);

  useEffect(() => {
    if (!added) return;
    const timeout = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(timeout);
  }, [added]);

  if (stock <= 0) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled
          className="inline-flex h-14 w-full cursor-not-allowed items-center justify-center rounded-full bg-sand px-8 font-sans text-base text-taupe"
        >
          Épuisé
        </button>
        <p className="font-sans text-sm text-taupe">
          {variant ? "Cette déclinaison sera" : "Ce produit sera"} bientôt de retour en boutique.
        </p>
      </div>
    );
  }

  const name = variant ? `${product.name} · ${variant.name}` : product.name;

  const handleAdd = () => {
    add(product.id, variant?.id, quantity, stock);
    setAdded(true);
    setQuantity(1);
    toast.success(name, {
      description:
        quantity > 1 ? `${quantity} articles ajoutés à votre panier` : "a été ajouté à votre panier",
      action: { label: "Voir le panier", onClick: () => router.push("/panier") },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="inline-flex h-14 shrink-0 items-center justify-between self-start rounded-full border border-sand font-sans text-cocoa sm:self-auto">
          <button
            type="button"
            onClick={() => setQuantity((q) => q - 1)}
            disabled={quantity === 1}
            aria-label="Diminuer la quantité"
            className="inline-flex size-14 items-center justify-center rounded-full transition-colors hover:bg-sand disabled:pointer-events-none disabled:text-sand"
          >
            <Minus className="size-4" strokeWidth={1.75} />
          </button>
          <span className="w-8 text-center text-base" aria-live="polite">
            <span className="sr-only">Quantité : </span>
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            disabled={quantity >= available}
            aria-label="Augmenter la quantité"
            className="inline-flex size-14 items-center justify-center rounded-full transition-colors hover:bg-sand disabled:pointer-events-none disabled:text-sand"
          >
            <Plus className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={available === 0}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-blush px-8 font-sans text-base text-cocoa transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:bg-sand disabled:text-taupe"
        >
          {added ? (
            <>
              <Check className="size-4" strokeWidth={1.75} />
              Ajouté !
            </>
          ) : (
            "Ajouter au panier"
          )}
        </button>
      </div>
      {available === 0 && (
        <p className="font-sans text-sm text-taupe">Tout le stock disponible est déjà dans votre panier.</p>
      )}
    </div>
  );
};

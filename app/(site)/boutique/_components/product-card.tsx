"use client";

import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProductVisual } from "@/components/shop/product-visual";
import { getDiscountPercent, type Product } from "@/lib/produits";
import { formatPrice } from "@/lib/prestations";
import { useCartStore } from "@/lib/stores/cart-store";

export const ProductCard = ({ product }: { product: Product }) => {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  // Confirmation « ajouté » affichée brièvement après l'ajout
  const [added, setAdded] = useState(false);
  const discount = getDiscountPercent(product);

  useEffect(() => {
    if (!added) return;
    const timeout = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(timeout);
  }, [added]);

  const handleAdd = () => {
    add(product.id);
    setAdded(true);
    toast.success(product.name, {
      description: "a été ajouté à votre panier",
      action: { label: "voir le panier", onClick: () => router.push("/panier") },
    });
  };

  return (
    <article className="flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius)] bg-sand">
        <ProductVisual
          product={product}
          sizes="(min-width: 1024px) 270px, (min-width: 768px) 33vw, 50vw"
        />

        {product.soldOut && (
          <span className="absolute top-3 left-3 rounded-full bg-pearl px-3 py-1 font-sans text-xs text-cocoa">
            Épuisé
          </span>
        )}

        {discount !== null && (
          <span className="absolute top-3 right-3 rounded-full bg-cocoa px-3 py-1 font-sans text-xs text-pearl">
            -{discount}%
          </span>
        )}
      </div>

      <h2 className="mt-4 font-serif text-[clamp(1rem,1.3vw,1.2rem)] leading-snug text-cocoa">
        {product.name}
      </h2>
      <p className="mt-1 mb-4 flex flex-wrap items-baseline gap-x-2 font-sans text-sm">
        <span className={discount !== null ? "text-cocoa" : "text-taupe"}>
          {formatPrice(product.price)}
        </span>
        {discount !== null && (
          <s className="text-xs text-taupe">
            <span className="sr-only">au lieu de </span>
            {formatPrice(product.compareAtPrice!)}
          </s>
        )}
      </p>

      <button
        type="button"
        onClick={handleAdd}
        disabled={product.soldOut}
        aria-label={
          product.soldOut ? `${product.name} épuisé` : `Ajouter ${product.name} au panier`
        }
        className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-blush px-4 font-sans text-sm text-cocoa transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:bg-sand disabled:text-taupe"
      >
        {product.soldOut ? (
          "épuisé"
        ) : added ? (
          <>
            <Check className="size-4" strokeWidth={1.75} />
            ajouté !
          </>
        ) : (
          <>
            <Plus className="size-4" strokeWidth={1.75} />
            ajouter au panier
          </>
        )}
      </button>
    </article>
  );
};

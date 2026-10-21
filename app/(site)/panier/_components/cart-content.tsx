"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { ProductVisual } from "@/components/shop/product-visual";
import { formatPrice } from "@/lib/prestations";
import { productCategories, products } from "@/lib/produits";
import { useCartHydrated, useCartStore } from "@/lib/stores/cart-store";

const categoryNames = new Map(productCategories.map((c) => [c.id, c.name]));

// Lignes du panier et récapitulatif de commande
export const CartContent = () => {
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  // Le panier est relu depuis le navigateur : rien à afficher côté serveur
  if (!hydrated) return <div className="min-h-64" aria-hidden />;

  // Ignore les produits retirés du catalogue depuis l'ajout au panier
  const lines = items.flatMap((item) => {
    const product = products.find((p) => p.id === item.id);
    return product ? [{ product, quantity: item.quantity }] : [];
  });

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <p className="font-serif text-[clamp(1.25rem,2vw,1.75rem)] text-cocoa">
          Votre panier est vide.
        </p>
        <p className="mt-3 max-w-md font-serif text-[clamp(1rem,1.3vw,1.15rem)] text-taupe italic">
          Découvrez nos vernis et nos soins pour prolonger le soin chez vous.
        </p>
        <Link
          href="/boutique"
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          découvrir la boutique
        </Link>
      </div>
    );
  }

  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-16">
      <div>
        <div className="flex items-baseline justify-between border-b border-sand pb-4">
          <p className="font-sans text-sm text-taupe">
            {count} article{count > 1 && "s"}
          </p>
          <button
            type="button"
            onClick={clear}
            className="font-sans text-sm text-cocoa underline-offset-4 hover:underline"
          >
            vider le panier
          </button>
        </div>

        <ul className="divide-y divide-sand">
          {lines.map(({ product, quantity }) => (
            <li key={product.id} className="flex gap-4 py-6 sm:gap-6">
              <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-[var(--radius)] bg-sand sm:w-28">
                <ProductVisual product={product} sizes="112px" iconClassName="size-7" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-serif text-[clamp(1.05rem,1.4vw,1.3rem)] leading-snug text-cocoa">
                      {product.name}
                    </h2>
                    <p className="mt-1 font-sans text-sm text-taupe">
                      {categoryNames.get(product.categoryId)} · {formatPrice(product.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(product.id)}
                    aria-label={`Retirer ${product.name} du panier`}
                    className="shrink-0 text-taupe transition-colors hover:text-cocoa"
                  >
                    <X className="size-5" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="inline-flex h-10 items-center rounded-full border border-sand font-sans text-cocoa">
                    <button
                      type="button"
                      onClick={() => setQuantity(product.id, quantity - 1)}
                      disabled={quantity === 1}
                      aria-label={`Diminuer la quantité de ${product.name}`}
                      className="inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-sand disabled:pointer-events-none disabled:text-sand"
                    >
                      <Minus className="size-4" strokeWidth={1.75} />
                    </button>
                    <span className="w-8 text-center text-sm" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(product.id, quantity + 1)}
                      aria-label={`Augmenter la quantité de ${product.name}`}
                      className="inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-sand"
                    >
                      <Plus className="size-4" strokeWidth={1.75} />
                    </button>
                  </div>

                  <p className="font-sans text-base whitespace-nowrap text-cocoa">
                    {formatPrice(product.price * quantity)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Récapitulatif : reste visible pendant le défilement sur grand écran */}
      <aside
        aria-label="Récapitulatif de la commande"
        className="rounded-[var(--radius)] border border-sand p-6 md:p-8 lg:sticky lg:top-32"
      >
        <h2 className="font-serif text-[clamp(1.4rem,2vw,1.75rem)] text-cocoa">Récapitulatif</h2>

        <dl className="mt-6 flex flex-col gap-3 border-b border-sand pb-6 font-sans text-sm text-cocoa">
          <div className="flex justify-between gap-4">
            <dt>Sous-total</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-taupe">
            <dt>Livraison</dt>
            <dd>calculée à l&apos;étape suivante</dd>
          </div>
        </dl>

        <div className="mt-6 flex items-baseline justify-between gap-4 text-cocoa">
          <p className="font-serif text-lg">Total</p>
          <p className="font-sans text-lg">{formatPrice(total)}</p>
        </div>

        <Link
          href="/commande"
          className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-full bg-blush px-8 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          passer la commande
        </Link>
        <Link
          href="/boutique"
          className="mt-4 block text-center font-sans text-sm text-cocoa underline-offset-4 hover:underline"
        >
          continuer mes achats
        </Link>
      </aside>
    </div>
  );
};

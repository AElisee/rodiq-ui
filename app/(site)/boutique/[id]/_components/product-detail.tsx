"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatPrice } from "@/lib/prestations";
import {
  VARIANT_LABEL,
  getDiscountPercent,
  type ProductCategory,
  productMeasures,
  productStock,
  stockLevel,
} from "@/lib/produits";
import { useShopCategories, useShopProduct } from "@/lib/stores/shop-store";
import { cn } from "@/lib/utils";
import { AddToCart } from "./add-to-cart";
import { ProductGallery } from "./product-gallery";
import { ProductDetailSkeleton } from "@/components/layout/site-skeleton";

const Breadcrumb = ({ category, name }: { category?: ProductCategory; name?: string }) => (
  <nav aria-label="Fil d'Ariane">
    <ol className="flex flex-wrap items-center gap-2 font-sans text-sm text-taupe">
      <li>
        <Link href="/boutique" className="underline-offset-4 hover:text-cocoa hover:underline">
          Boutique
        </Link>
      </li>
      {category && (
        <li className="flex items-center gap-2">
          <ChevronRight className="size-3.5" strokeWidth={1.75} aria-hidden />
          <Link
            href={`/boutique?categorie=${encodeURIComponent(category.id)}`}
            className="underline-offset-4 hover:text-cocoa hover:underline"
          >
            {category.name}
          </Link>
        </li>
      )}
      {name && (
        <li aria-current="page" className="flex items-center gap-2 text-cocoa">
          <ChevronRight className="size-3.5" strokeWidth={1.75} aria-hidden />
          {name}
        </li>
      )}
    </ol>
  </nav>
);

const Unavailable = ({ children }: { children: ReactNode }) => (
  <>
    <Breadcrumb />
    <div className="flex flex-col items-center py-20 text-center">{children}</div>
  </>
);

const shopLinkClassName =
  "mt-10 inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand";

// Fil d'Ariane, photos, prix, déclinaisons et ajout au panier, lus depuis l'API
export const ProductDetail = ({ id }: { id: string }) => {
  const { product, error, retry } = useShopProduct(id);
  const categories = useShopCategories();
  const variants = product?.variants ?? [];
  // Première déclinaison disponible choisie par défaut
  const [variantId, setVariantId] = useState<string>();
  const selectedId = variantId ?? (variants.find((v) => v.stock > 0) ?? variants[0])?.id;

  // Produit supprimé ou masqué depuis l'admin
  if (error?.status === 404) {
    return (
      <Unavailable>
        <p className="font-serif text-[clamp(1.25rem,2vw,1.75rem)] text-cocoa">
          Ce produit n&apos;est plus disponible en boutique.
        </p>
        <Link href="/boutique" className={shopLinkClassName}>
          Découvrir la boutique
        </Link>
      </Unavailable>
    );
  }

  if (error && !product) {
    return (
      <Unavailable>
        <p role="alert" className="font-serif text-[clamp(1.25rem,2vw,1.75rem)] text-cocoa">
          Ce produit n&apos;a pas pu être chargé.
        </p>
        <p className="mt-3 max-w-md font-sans text-sm text-taupe">{error.message}</p>
        <button type="button" onClick={() => void retry()} className={shopLinkClassName}>
          Réessayer
        </button>
      </Unavailable>
    );
  }

  if (!product) return <ProductDetailSkeleton />;

  const category = categories.find((c) => c.id === product.categoryId);
  const discount = getDiscountPercent(product);
  const variant = variants.find((v) => v.id === selectedId);
  const stock = productStock(product, variant?.id);
  // Quantité plafonnée par l'API : « plus que N » seulement sous le seuil d'alerte par défaut
  const lowStock = stockLevel(stock) === "faible";
  const measures = productMeasures(product);

  return (
    <>
      <Breadcrumb category={category} name={product.name} />

      <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-12 lg:gap-20">
        <ProductGallery product={product}>
          {product.soldOut && (
            <span className="absolute top-4 left-4 rounded-full bg-pearl px-4 py-1.5 font-sans text-sm text-cocoa">
              Épuisé
            </span>
          )}

          {discount !== null && (
            <span className="absolute top-4 right-4 rounded-full bg-cocoa px-4 py-1.5 font-sans text-sm text-pearl">
              -{discount}%
            </span>
          )}
        </ProductGallery>

        <div className="flex flex-col md:py-4">
          {category && (
            <p className="font-sans text-sm tracking-widest text-taupe uppercase">{category.name}</p>
          )}
          <h1 className="mt-3 font-serif text-[clamp(2rem,3.5vw,3rem)] leading-tight font-normal text-balance text-cocoa">
            {product.name}
          </h1>

          <p className="mt-4 flex flex-wrap items-baseline gap-x-3 font-sans">
            <span className="text-xl text-cocoa">{formatPrice(product.price)}</span>
            {discount !== null && (
              <s className="text-base text-taupe">
                <span className="sr-only">au lieu de </span>
                {formatPrice(product.compareAtPrice!)}
              </s>
            )}
            {measures.length > 0 && <span className="text-base text-taupe">· {measures.join(" · ")}</span>}
          </p>

          <p className="mt-8 border-t border-sand pt-8 font-serif text-[clamp(1rem,1.3vw,1.2rem)] leading-relaxed text-cocoa">
            {product.description || category?.description}
          </p>

          {variants.length > 0 && (
            <fieldset className="mt-8">
              <legend className="font-sans text-sm text-cocoa">
                {VARIANT_LABEL}
                {variant && <span className="text-taupe"> : {variant.name}</span>}
              </legend>
              <div className="mt-3 flex flex-wrap gap-3">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    aria-pressed={v.id === selectedId}
                    className={cn(
                      "rounded-full border border-sand px-5 py-2 font-sans text-sm text-cocoa transition-colors hover:bg-sand",
                      v.id === selectedId && "border-cocoa bg-sand",
                      v.stock <= 0 && "text-taupe line-through",
                    )}
                  >
                    {v.name}
                    {v.stock <= 0 && <span className="sr-only"> (épuisé)</span>}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {lowStock && (
            <p className="mt-6 font-sans text-sm text-cocoa">
              Plus que {stock} en stock{variant && ` (${variant.name})`}.
            </p>
          )}

          <div className={lowStock ? "mt-4" : "mt-10"}>
            <AddToCart key={variant?.id} product={product} variant={variant} stock={stock} />
          </div>

          <Link
            href="/boutique"
            className="mt-6 self-center font-sans text-sm text-cocoa underline-offset-4 hover:underline md:self-start"
          >
            continuer mes achats
          </Link>
        </div>
      </div>
    </>
  );
};

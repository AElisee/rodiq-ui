"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/prestations";
import { getDiscountPercent, type Product, type ProductCategory } from "@/lib/produits";
import { useShopProduct } from "@/lib/stores/catalog-store";
import { AddToCart } from "./add-to-cart";
import { ProductGallery } from "./product-gallery";

type ProductDetailProps = {
  product: Product;
  category?: ProductCategory;
};

// Photos, prix et ajout au panier, avec les modifications de l'admin
export const ProductDetail = ({ product: baseProduct, category }: ProductDetailProps) => {
  const product = useShopProduct(baseProduct);
  const discount = getDiscountPercent(product);

  if (product.hidden) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <p className="font-serif text-[clamp(1.25rem,2vw,1.75rem)] text-cocoa">
          Ce produit n&apos;est plus disponible en boutique.
        </p>
        <Link
          href="/boutique"
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  return (
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
        </p>

        <p className="mt-8 border-t border-sand pt-8 font-serif text-[clamp(1rem,1.3vw,1.2rem)] leading-relaxed text-cocoa">
          {product.description ?? category?.description}
        </p>

        <div className="mt-10">
          <AddToCart product={product} />
        </div>

        <Link
          href="/boutique"
          className="mt-6 self-center font-sans text-sm text-cocoa underline-offset-4 hover:underline md:self-start"
        >
          continuer mes achats
        </Link>
      </div>
    </div>
  );
};

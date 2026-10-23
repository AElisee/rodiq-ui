"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ProductVisual } from "@/components/shop/product-visual";
import type { Product } from "@/lib/produits";
import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  product: Product;
  // Pastilles (épuisé, réduction) superposées à la photo principale
  children?: ReactNode;
};

// Photo principale et vignettes des autres photos du produit
export const ProductGallery = ({ product, children }: ProductGalleryProps) => {
  const images = product.images ?? [];
  const [index, setIndex] = useState(0);
  const hasMany = images.length > 1;

  const show = (next: number) => setIndex((next + images.length) % images.length);
  const photoAlt = (i: number) =>
    hasMany ? `${product.name}, photo ${i + 1} sur ${images.length}` : product.name;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius)] bg-sand">
        <ProductVisual
          key={index}
          product={product}
          image={images[index]}
          alt={photoAlt(index)}
          preload={index === 0}
          sizes="(min-width: 1152px) 540px, (min-width: 768px) 50vw, 100vw"
          iconClassName="size-16"
        />

        {children}

        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => show(index - 1)}
              aria-label="Photo précédente"
              className="absolute top-1/2 left-3 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-pearl text-cocoa transition-colors hover:bg-sand"
            >
              <ChevronLeft className="size-5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => show(index + 1)}
              aria-label="Photo suivante"
              className="absolute top-1/2 right-3 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-pearl text-cocoa transition-colors hover:bg-sand"
            >
              <ChevronRight className="size-5" strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      {hasMany && (
        <ul aria-label="Photos du produit" className="grid grid-cols-5 gap-3">
          {images.map((image, i) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Afficher la photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-[var(--radius)] border-2 bg-sand transition-colors",
                  i === index ? "border-cocoa" : "border-transparent hover:border-sand",
                )}
              >
                <ProductVisual product={product} image={image} alt="" sizes="100px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

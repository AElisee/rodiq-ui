import Image, { type StaticImageData } from "next/image";
import { Gem } from "lucide-react";
import type { Product } from "@/lib/produits";
import { cn } from "@/lib/utils";

type ProductVisualProps = {
  product: Product;
  sizes: string;
  // Photo à afficher (galerie de la fiche produit) ; par défaut la photo principale
  image?: StaticImageData;
  alt?: string;
  preload?: boolean;
  iconClassName?: string;
};

// Photo du produit, ou visuel provisoire tant que la photo n'est pas fournie
export const ProductVisual = ({
  product,
  sizes,
  image = product.images?.[0],
  alt = product.name,
  preload,
  iconClassName,
}: ProductVisualProps) =>
  image ? (
    <Image
      src={image}
      alt={alt}
      fill
      preload={preload}
      placeholder="blur"
      sizes={sizes}
      className="object-cover transition-transform duration-500 hover:scale-105"
    />
  ) : (
    <div className="flex size-full items-center justify-center text-pearl" aria-hidden>
      <Gem className={cn("size-10", iconClassName)} strokeWidth={1.25} />
    </div>
  );

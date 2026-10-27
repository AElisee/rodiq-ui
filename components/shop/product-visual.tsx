import Image from "next/image";
import { Gem } from "lucide-react";
import type { Product } from "@/lib/produits";
import { cn } from "@/lib/utils";

type ProductVisualProps = {
  product: Pick<Product, "name" | "images">;
  sizes: string;
  // Photo à afficher (galerie de la fiche produit) ; par défaut la photo principale
  image?: string;
  alt?: string;
  preload?: boolean;
  iconClassName?: string;
};

// Photo du produit, ou visuel provisoire tant qu'aucune photo n'est ajoutée
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
      // Photo servie par l'API (ou data URL avant envoi) : déjà réduite à l'ajout, sans optimisation Next
      unoptimized
      sizes={sizes}
      className="object-cover transition-transform duration-500 hover:scale-105"
    />
  ) : (
    <div className="flex size-full items-center justify-center text-pearl" aria-hidden>
      <Gem className={cn("size-10", iconClassName)} strokeWidth={1.25} />
    </div>
  );

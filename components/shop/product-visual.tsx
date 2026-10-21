import Image from "next/image";
import { Gem } from "lucide-react";
import type { Product } from "@/lib/produits";
import { cn } from "@/lib/utils";

type ProductVisualProps = {
  product: Product;
  sizes: string;
  iconClassName?: string;
};

// Photo du produit, ou visuel provisoire tant que la photo n'est pas fournie
export const ProductVisual = ({ product, sizes, iconClassName }: ProductVisualProps) =>
  product.image ? (
    <Image
      src={product.image}
      alt={product.name}
      fill
      placeholder="blur"
      sizes={sizes}
      className="object-cover transition-transform duration-500 hover:scale-105"
    />
  ) : (
    <div className="flex size-full items-center justify-center text-pearl" aria-hidden>
      <Gem className={cn("size-10", iconClassName)} strokeWidth={1.25} />
    </div>
  );

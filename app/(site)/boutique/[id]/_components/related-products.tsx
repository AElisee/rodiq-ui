"use client";

import type { Product } from "@/lib/produits";
import { useCatalogStore } from "@/lib/stores/catalog-store";
import { ProductCard } from "../../_components/product-card";

// Suggestions de la même catégorie, sans les produits masqués par l'admin
export const RelatedProducts = ({ products }: { products: Product[] }) => {
  const overrides = useCatalogStore((s) => s.productOverrides);

  return products
    .filter((item) => !overrides[item.id]?.hidden)
    .map((item) => (
      <li key={item.id}>
        <ProductCard product={item} headingAs="h3" />
      </li>
    ));
};

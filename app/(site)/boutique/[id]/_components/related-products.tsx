"use client";

import { useEffect } from "react";
import { useShopStore } from "@/lib/stores/shop-store";
import { ProductCard } from "../../_components/product-card";

// Suggestions de la même catégorie, lues une fois la fiche chargée (jamais de produit masqué)
export const RelatedProducts = ({ id }: { id: string }) => {
  const product = useShopStore((s) => s.products[id]);
  const related = useShopStore((s) => s.related[id]) ?? [];
  const loadRelated = useShopStore((s) => s.loadRelated);
  const categoryId = product?.categoryId;

  useEffect(() => {
    const current = useShopStore.getState().products[id];
    if (current) void loadRelated(current);
  }, [id, categoryId, loadRelated]);

  if (!product || related.length === 0) return null;

  return (
    <section className="w-full border-t border-sand bg-pearl px-4 py-16 md:px-8 md:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="text-center font-serif text-[clamp(1.75rem,3vw,2.5rem)] text-cocoa">
          Vous aimerez aussi
        </h2>

        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
          {related.map((item) => (
            <li key={item.id}>
              <ProductCard product={item} headingAs="h3" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

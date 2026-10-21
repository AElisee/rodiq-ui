"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useEffect } from "react";
import { selectCartCount, useCartStore } from "@/lib/stores/cart-store";

export const CartLink = () => {
  const count = useCartStore(selectCartCount);

  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  return (
    <Link
      href="/panier"
      aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}
      className="flex items-center gap-1.5 text-base font-semibold transition-opacity hover:opacity-75"
    >
      <ShoppingCart className="size-6" strokeWidth={1.5} />
      <span>{count}</span>
    </Link>
  );
};

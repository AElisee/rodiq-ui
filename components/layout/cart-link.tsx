import Link from "next/link";
import { ShoppingCart } from "lucide-react";

// Compteur statique pour l'instant : il sera branché sur le store panier (Zustand)
export const CartLink = () => (
  <Link
    href="/panier"
    aria-label="Panier, 0 article"
    className="flex items-center gap-1.5 text-base font-semibold transition-opacity hover:opacity-75"
  >
    <ShoppingCart className="size-6" strokeWidth={1.5} />
    <span>0</span>
  </Link>
);

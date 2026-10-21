"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect } from "react";
import { allPrestations, formatPrice } from "@/lib/prestations";
import { useBookingStore } from "@/lib/stores/booking-store";

// Barre fixe en bas d'écran : récapitulatif de la sélection et accès à la réservation
export const BookingBar = () => {
  const selectedIds = useBookingStore((s) => s.selectedIds);
  const remove = useBookingStore((s) => s.remove);
  const clear = useBookingStore((s) => s.clear);

  useEffect(() => {
    useBookingStore.persist.rehydrate();
  }, []);

  const selected = allPrestations.filter((p) => selectedIds.includes(p.id));
  if (selected.length === 0) return null;

  const total = selected.reduce((sum, p) => sum + p.price, 0);
  const hasFromPrice = selected.some((p) => p.fromPrice);

  return (
    <>
      {/* Espace réservé pour que la barre ne masque pas le bas de la page */}
      <div className="h-44 md:h-32" aria-hidden />

      <div
        role="region"
        aria-label="Votre réservation"
        className="fixed inset-x-0 bottom-0 z-10 bg-cocoa px-4 py-5 text-pearl shadow-sm md:px-8"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="min-w-0">
            <p className="font-serif text-lg">
              {selected.length} prestation{selected.length > 1 && "s"} ·{" "}
              {formatPrice(total, hasFromPrice)}
            </p>
            {/* Barre de défilement fine aux couleurs de la charte */}
            <ul className="mt-2 flex gap-2 overflow-x-auto pb-2 font-sans text-sm [scrollbar-color:var(--color-taupe)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-taupe [&::-webkit-scrollbar-track]:bg-transparent">
              {selected.map((p) => (
                <li key={p.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label={`Retirer ${p.name}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-taupe px-3 py-1 transition-colors hover:border-blush hover:text-blush"
                  >
                    {p.name}
                    <X className="size-3.5" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex shrink-0 items-center gap-6">
            <button
              type="button"
              onClick={clear}
              className="font-sans text-sm underline-offset-4 hover:underline"
            >
              Tout retirer
            </button>
            <Link
              href="/reservation"
              className="inline-flex h-14 flex-1 items-center justify-center rounded-full bg-blush px-8 font-sans text-base text-cocoa transition-colors hover:bg-sand md:flex-none"
            >
              Continuer la réservation
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

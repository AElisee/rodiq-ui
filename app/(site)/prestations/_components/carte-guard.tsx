"use client";

import { useState, type ReactNode } from "react";
import { usePrestationsHydrated, usePrestationsStore } from "@/lib/stores/prestations-store";

// Affiche la carte une fois lue ; sinon dit pourquoi elle n'apparaît pas (chargement, échec, carte vide).
// Partagé par la page /prestations et l'étape « prestations » de la réservation
export const CarteGuard = ({ children }: { children: ReactNode }) => {
  const loaded = usePrestationsHydrated();
  const loadError = usePrestationsStore((s) => s.loadError);
  const empty = usePrestationsStore((s) => s.categories.every((c) => c.prestations.length === 0));
  const load = usePrestationsStore((s) => s.load);
  const [retrying, setRetrying] = useState(false);

  if (!loaded) return <div className="min-h-48" aria-hidden />;

  if (loadError) {
    const retry = async () => {
      setRetrying(true);
      await load();
      setRetrying(false);
    };
    return (
      <div role="alert" className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="font-serif text-lg text-cocoa">La carte des prestations n&apos;a pas pu être chargée.</p>
        <p className="max-w-md font-sans text-sm text-taupe">{loadError}</p>
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="rounded-full bg-blush px-6 py-2.5 font-sans text-sm text-cocoa transition-colors hover:bg-sand disabled:opacity-60"
        >
          {retrying ? "Chargement…" : "Réessayer"}
        </button>
      </div>
    );
  }

  if (empty) {
    return (
      <p className="mt-10 text-center font-serif text-lg text-cocoa">
        Aucune prestation n&apos;est proposée pour le moment.
      </p>
    );
  }

  return children;
};

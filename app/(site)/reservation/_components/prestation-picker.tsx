"use client";

import { Check } from "lucide-react";
import { formatPrice } from "@/lib/prestations";
import { useBookingStore } from "@/lib/stores/booking-store";
import { usePrestationCategories } from "@/lib/stores/catalog-store";
import { cn } from "@/lib/utils";

// Étape 1 : sélection des prestations (partagée avec la page /prestations)
export const PrestationPicker = () => {
  const selectedIds = useBookingStore((s) => s.selectedIds);
  const toggle = useBookingStore((s) => s.toggle);
  const prestationCategories = usePrestationCategories();

  return (
    <div className="flex flex-col gap-8">
      {prestationCategories.map((category) => (
        <div key={category.id} role="group" aria-labelledby={`picker-${category.id}`}>
          <h3 id={`picker-${category.id}`} className="font-serif text-lg text-cocoa">
            {category.name}
          </h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {category.prestations.map((prestation) => {
              const selected = selectedIds.includes(prestation.id);
              return (
                <button
                  key={prestation.id}
                  type="button"
                  onClick={() => toggle(prestation.id)}
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-sand px-4 py-2 text-left font-sans text-sm text-cocoa transition-colors hover:bg-sand",
                    selected && "border-cocoa bg-sand",
                  )}
                >
                  {selected && <Check className="size-4 shrink-0" strokeWidth={1.75} />}
                  <span>{prestation.name}</span>
                  <span className="text-taupe">
                    · {formatPrice(prestation.price, prestation.fromPrice)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

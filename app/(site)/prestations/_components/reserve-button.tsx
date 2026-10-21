"use client";

import { Check, Plus } from "lucide-react";
import { useBookingStore } from "@/lib/stores/booking-store";
import { cn } from "@/lib/utils";

// Ajoute (ou retire) la prestation de la réservation en cours
export const ReserveButton = ({ id, name }: { id: string; name: string }) => {
  const selected = useBookingStore((s) => s.selectedIds.includes(id));
  const toggle = useBookingStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-pressed={selected}
      aria-label={selected ? `Retirer ${name} de la réservation` : `Réserver ${name}`}
      className={cn(
        "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-6 font-sans text-base text-cocoa transition-colors hover:bg-sand",
        selected ? "bg-sand" : "bg-blush",
      )}
    >
      {selected ? (
        <Check className="size-4" strokeWidth={1.75} />
      ) : (
        <Plus className="size-4" strokeWidth={1.75} />
      )}
      {selected ? "Ajoutée" : "Réserver"}
    </button>
  );
};

"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { errorMessage } from "@/lib/api/client";
import { formatDay, formatSlotTime, type Reservation } from "@/lib/reservations";
import { useReservationStore } from "@/lib/stores/reservation-store";

// Confirmation d'annulation, avec un motif facultatif transmis au salon
export const CancelDialog = ({ reservation }: { reservation: Reservation }) => {
  const cancel = useReservationStore((s) => s.cancel);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await cancel(reservation.id, reason.trim() || undefined);
      setOpen(false);
      toast("Réservation annulée", { description: `Référence ${reservation.reference}` });
    } catch (error) {
      toast.error(`La réservation ${reservation.reference} n'a pas été annulée`, {
        description: errorMessage(error),
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="font-sans text-sm text-cocoa underline underline-offset-4 transition-colors hover:text-taupe"
        >
          Annuler la réservation
        </button>
      </DialogTrigger>

      <DialogContent className="gap-0 rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-md md:p-8">
        <DialogTitle className="font-serif text-xl leading-tight font-normal">
          Annuler cette réservation ?
        </DialogTitle>
        <DialogDescription className="mt-3 text-sm text-taupe">
          <span className="first-letter:uppercase">{formatDay(reservation.date)}</span>,{" "}
          {formatSlotTime(reservation.start, reservation.end)}. Le créneau sera libéré pour une autre
          cliente.
        </DialogDescription>

        <label htmlFor={`reason-${reservation.id}`} className="mt-6 mb-2 block text-sm">
          Motif
        </label>
        <textarea
          id={`reason-${reservation.id}`}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          className="w-full rounded-[var(--radius)] border border-sand bg-pearl px-5 py-3 text-base outline-none transition-colors placeholder:text-taupe focus-visible:border-taupe"
        />

        <div className="mt-8 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <button type="button" className="text-sm underline-offset-4 hover:underline">
              Garder ma réservation
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-blush px-6 text-base text-cocoa transition-colors hover:bg-sand sm:w-auto"
          >
            Confirmer l&apos;annulation
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

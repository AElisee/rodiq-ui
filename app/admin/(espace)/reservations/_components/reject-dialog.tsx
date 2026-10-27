"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  adminButtonClassName,
  adminLabelClassName,
  adminSmallOutlineButtonClassName,
  adminTextareaClassName,
} from "@/components/admin/admin-ui";
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
import { useAdminReservationsStore } from "@/lib/stores/admin-reservations-store";

// Suggestions de motifs, modifiables avant l'envoi
const presetReasons = [
  "Le créneau n'est plus disponible : merci d'en choisir un autre.",
  "Cette prestation demande plus de temps : appelez-nous pour réserver deux créneaux.",
  "Le salon sera exceptionnellement fermé ce jour-là.",
];

// Refus d'une réservation : le motif est obligatoire et affiché à la cliente
export const RejectDialog = ({ reservation }: { reservation: Reservation }) => {
  const reject = useAdminReservationsStore((s) => s.reject);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const valid = reason.trim().length >= 5;

  const confirm = async () => {
    setPending(true);
    try {
      await reject(reservation.id, reason.trim());
      setOpen(false);
      setReason("");
      toast("Réservation refusée", {
        description: `${reservation.client.firstName} ${reservation.client.lastName} · ${reservation.reference}`,
      });
    } catch (error) {
      toast.error(`La réservation ${reservation.reference} n'a pas été refusée`, {
        description: errorMessage(error),
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={adminSmallOutlineButtonClassName}>
          Refuser
        </button>
      </DialogTrigger>

      <DialogContent className="gap-0 rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-lg md:p-8">
        <DialogTitle className="font-serif text-xl leading-tight font-normal">Refuser cette réservation ?</DialogTitle>
        <DialogDescription className="mt-3 text-sm text-taupe">
          {reservation.client.firstName} {reservation.client.lastName} ·{" "}
          <span className="first-letter:uppercase">{formatDay(reservation.date)}</span>,{" "}
          {formatSlotTime(reservation.start, reservation.end)}. Le créneau sera libéré.
        </DialogDescription>

        <p className="mt-6 mb-2 text-sm">Motifs fréquents</p>
        <div className="flex flex-wrap gap-2">
          {presetReasons.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className="rounded-[var(--radius)] border border-sand px-3 py-1.5 text-left text-xs transition-colors hover:bg-sand"
            >
              {preset}
            </button>
          ))}
        </div>

        <label htmlFor={`reject-${reservation.id}`} className={`mt-6 ${adminLabelClassName}`}>
          Motif transmis au client ou à la cliente *
        </label>
        <textarea
          id={`reject-${reservation.id}`}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          aria-required
          className={adminTextareaClassName}
        />

        <div className="mt-8 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <button type="button" className="text-sm underline-offset-4 hover:underline">
              Annuler
            </button>
          </DialogClose>
          <button type="button" onClick={confirm} disabled={!valid || pending} className={`w-full sm:w-auto ${adminButtonClassName}`}>
            Confirmer le refus
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

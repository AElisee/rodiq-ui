"use client";

import { toast } from "sonner";
import { adminSmallButtonClassName } from "@/components/admin/admin-ui";
import { formatSlotTime, toDateKey, type Reservation } from "@/lib/reservations";
import { useReservationStore } from "@/lib/stores/reservation-store";
import { RejectDialog } from "./reject-dialog";

// Actions possibles selon le statut : confirmer, refuser, marquer le soin terminé
export const ReservationActions = ({ reservation: r }: { reservation: Reservation }) => {
  const confirm = useReservationStore((s) => s.confirm);
  const complete = useReservationStore((s) => s.complete);
  const today = toDateKey(new Date());

  const handleConfirm = () => {
    confirm(r.id);
    toast.success("Réservation confirmée", {
      description: `${r.client.firstName} ${r.client.lastName} · ${formatSlotTime(r.start, r.end)}`,
    });
  };

  const handleComplete = () => {
    complete(r.id);
    toast.success("Soin marqué comme terminé", { description: `${r.client.firstName} ${r.client.lastName}` });
  };

  if (r.status === "en_attente")
    return (
      <>
        <button type="button" onClick={handleConfirm} className={adminSmallButtonClassName}>
          Confirmer
        </button>
        <RejectDialog reservation={r} />
      </>
    );

  if (r.status === "confirmee")
    return r.date <= today ? (
      <button type="button" onClick={handleComplete} className={adminSmallButtonClassName}>
        Soin terminé
      </button>
    ) : (
      <RejectDialog reservation={r} />
    );

  return null;
};

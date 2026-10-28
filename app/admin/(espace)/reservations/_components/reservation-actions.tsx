"use client";

import { useState } from "react";
import { toast } from "sonner";
import { adminSmallButtonClassName, PendingLabel } from "@/components/admin/admin-ui";
import { errorMessage } from "@/lib/api/client";
import { formatSlotTime, toDateKey, type Reservation } from "@/lib/reservations";
import { useAdminReservationsStore } from "@/lib/stores/admin-reservations-store";
import { RejectDialog } from "./reject-dialog";

// Actions possibles selon le statut : confirmer, refuser, marquer le soin terminé
export const ReservationActions = ({ reservation: r }: { reservation: Reservation }) => {
  const confirm = useAdminReservationsStore((s) => s.confirm);
  const complete = useAdminReservationsStore((s) => s.complete);
  const [pending, setPending] = useState(false);
  const today = toDateKey(new Date());
  const who = `${r.client.firstName} ${r.client.lastName}`;

  const run = async (request: () => Promise<unknown>, success: string, failure: string, description: string) => {
    setPending(true);
    try {
      await request();
      toast.success(success, { description });
    } catch (error) {
      toast.error(failure, { description: errorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  const handleConfirm = () =>
    run(
      () => confirm(r.id),
      "Réservation confirmée",
      `La réservation ${r.reference} n'a pas été confirmée`,
      `${who} · ${formatSlotTime(r.start, r.end)}`,
    );

  const handleComplete = () =>
    run(
      () => complete(r.id),
      "Soin marqué comme terminé",
      `La réservation ${r.reference} n'a pas été marquée terminée`,
      who,
    );

  if (r.status === "en_attente")
    return (
      <>
        <button type="button" onClick={handleConfirm} disabled={pending} className={adminSmallButtonClassName}>
          <PendingLabel pending={pending}>Confirmer</PendingLabel>
        </button>
        <RejectDialog reservation={r} />
      </>
    );

  if (r.status === "confirmee")
    return r.date <= today ? (
      <button type="button" onClick={handleComplete} disabled={pending} className={adminSmallButtonClassName}>
        <PendingLabel pending={pending}>Soin terminé</PendingLabel>
      </button>
    ) : (
      <RejectDialog reservation={r} />
    );

  return null;
};

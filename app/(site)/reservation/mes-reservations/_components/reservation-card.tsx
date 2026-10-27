"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPrice } from "@/lib/prestations";
import {
  formatDay,
  formatShortDay,
  formatSlotTime,
  hasFromPrice,
  isActive,
  reservationTotal,
  statusMeta,
  type Reservation,
} from "@/lib/reservations";
import { useBookingStore } from "@/lib/stores/booking-store";
import { useAllPrestations, usePrestationsStore } from "@/lib/stores/prestations-store";
import { cn } from "@/lib/utils";
import { CancelDialog } from "./cancel-dialog";

export const ReservationCard = ({ reservation }: { reservation: Reservation }) => {
  const router = useRouter();
  const toggle = useBookingStore((s) => s.toggle);
  const clear = useBookingStore((s) => s.clear);
  const allPrestations = useAllPrestations();
  const catalogueError = usePrestationsStore((s) => s.loadError);

  // Prestations et prix figés au moment de la demande
  const lines = reservation.lines;
  const status = statusMeta[reservation.status];

  // Reprend les mêmes prestations (encore proposées) pour une nouvelle réservation
  const bookAgain = () => {
    if (catalogueError) {
      toast.error("Impossible de reprendre ces prestations", {
        description: `La carte des prestations n'a pas pu être chargée : ${catalogueError}`,
      });
      return;
    }
    clear();
    const prestationIds = lines.map((line) => line.prestationId);
    const offered = allPrestations.filter((p) => prestationIds.includes(p.id));
    offered.forEach((p) => toggle(p.id));
    const withdrawn = prestationIds.length - offered.length;
    if (withdrawn > 0) {
      toast(
        withdrawn > 1
          ? `${withdrawn} prestations de cette réservation ne sont plus proposées`
          : "Une prestation de cette réservation n'est plus proposée",
        { description: "Seules les prestations encore à la carte ont été reprises." },
      );
    }
    router.push("/reservation");
  };

  return (
    <article className="rounded-[var(--radius)] border border-sand p-6 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-[clamp(1.15rem,1.6vw,1.4rem)] text-cocoa first-letter:uppercase">
            {formatDay(reservation.date)}
          </h2>
          <p className="mt-1 font-sans text-sm text-taupe">
            {formatSlotTime(reservation.start, reservation.end)} · Réf. {reservation.reference}
          </p>
        </div>
        <span className={cn("rounded-full px-4 py-1 font-sans text-sm", status.badgeClassName)}>
          {status.label}
        </span>
      </header>

      <ul className="mt-6 flex flex-col gap-2 border-t border-sand pt-6 font-sans text-sm text-cocoa">
        {lines.map((line) => (
          <li key={line.prestationId} className="flex justify-between gap-4">
            <span>{line.name}</span>
            <span className="whitespace-nowrap">{formatPrice(line.price, line.fromPrice)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-4 pt-2 font-serif text-base">
          <span>Total estimé</span>
          <span className="font-sans">
            {formatPrice(reservationTotal(reservation), hasFromPrice(reservation))}
          </span>
        </li>
      </ul>

      <div className="mt-6 border-t border-sand pt-6 font-sans text-sm">
        <p className="text-taupe">{status.description}</p>

        {reservation.status === "refusee" && reservation.rejectionReason && (
          <p className="mt-3 rounded-[var(--radius)] bg-sand px-5 py-4 text-cocoa">
            <span className="block font-serif text-base">Motif</span>
            {reservation.rejectionReason}
          </p>
        )}
        {reservation.status === "annulee" && reservation.cancellationReason && (
          <p className="mt-3 text-cocoa">Votre motif : {reservation.cancellationReason}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          {reservation.canCancel && reservation.cancellationDeadline ? (
            <>
              <p className="text-taupe">
                Annulation en ligne possible jusqu&apos;au {formatShortDay(reservation.cancellationDeadline)} inclus.
              </p>
              <CancelDialog reservation={reservation} />
            </>
          ) : isActive(reservation.status) ? (
            <p className="text-taupe">
              Le délai d&apos;annulation en ligne est dépassé : contactez le salon pour toute
              modification.
            </p>
          ) : (
            (reservation.status === "terminee" || reservation.status === "refusee") && (
              <button
                type="button"
                onClick={bookAgain}
                className="ml-auto inline-flex h-11 items-center justify-center rounded-full bg-blush px-6 font-sans text-base text-cocoa transition-colors hover:bg-sand"
              >
                Réserver à nouveau
              </button>
            )
          )}
        </div>
      </div>
    </article>
  );
};

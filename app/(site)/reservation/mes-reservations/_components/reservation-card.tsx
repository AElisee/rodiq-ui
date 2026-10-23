"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/prestations";
import {
  canCancel,
  cancellationDeadline,
  formatDay,
  formatSlotTime,
  isActive,
  statusMeta,
  type Reservation,
} from "@/lib/reservations";
import { useBookingStore } from "@/lib/stores/booking-store";
import { useAllPrestations } from "@/lib/stores/catalog-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";
import { CancelDialog } from "./cancel-dialog";

export const ReservationCard = ({ reservation }: { reservation: Reservation }) => {
  const router = useRouter();
  const toggle = useBookingStore((s) => s.toggle);
  const clear = useBookingStore((s) => s.clear);
  const allPrestations = useAllPrestations();
  const noticeDays = useSettingsStore((s) => s.rules.cancellationNoticeDays);

  const prestations = allPrestations.filter((p) => reservation.prestationIds.includes(p.id));
  const total = prestations.reduce((sum, p) => sum + p.price, 0);
  const status = statusMeta[reservation.status];
  const deadline = format(cancellationDeadline(reservation, noticeDays), "d MMMM", { locale: fr });

  // Reprend les mêmes prestations pour une nouvelle réservation
  const bookAgain = () => {
    clear();
    prestations.forEach((p) => toggle(p.id));
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
        {prestations.map((p) => (
          <li key={p.id} className="flex justify-between gap-4">
            <span>{p.name}</span>
            <span className="whitespace-nowrap">{formatPrice(p.price, p.fromPrice)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-4 pt-2 font-serif text-base">
          <span>Total estimé</span>
          <span className="font-sans">
            {formatPrice(total, prestations.some((p) => p.fromPrice))}
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
          {canCancel(reservation, noticeDays) ? (
            <>
              <p className="text-taupe">Annulation en ligne possible jusqu&apos;au {deadline} inclus.</p>
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

"use client";

import Link from "next/link";
import {
  contactChannels,
  formatDay,
  formatShortDay,
  formatSlotTime,
  statusMeta,
  type Reservation,
} from "@/lib/reservations";
import { cn } from "@/lib/utils";

type BookingConfirmationProps = {
  // Réservation enregistrée, telle que renvoyée par l'API
  reservation: Reservation;
  // Le compte a été créé avec cette demande
  accountCreated: boolean;
};

// Écran affiché une fois la demande enregistrée par l'API
export const BookingConfirmation = ({ reservation, accountCreated }: BookingConfirmationProps) => {
  const { client } = reservation;
  const channel = contactChannels.find((c) => c.value === client.contactChannel)?.label;
  const contact =
    client.contactChannel === "email"
      ? client.email
      : client.contactChannel === "whatsapp"
        ? (client.whatsapp ?? client.phone)
        : client.phone;
  const status = statusMeta[reservation.status];

  return (
    <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center text-center">
      <p className="font-serif text-[clamp(1.5rem,2.5vw,2.25rem)] leading-tight text-cocoa">
        Merci {client.firstName}, votre demande est bien envoyée.
      </p>
      <p className="mt-4 font-serif text-[clamp(1rem,1.3vw,1.15rem)] text-taupe italic">
        Nous revenons vers vous par {channel?.toLowerCase()} au {contact} pour confirmer votre
        rendez-vous.
      </p>

      <div className="mt-10 w-full rounded-[var(--radius)] border border-sand p-6 text-left md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand pb-6">
          <div>
            <p className="font-sans text-sm text-taupe">Référence</p>
            <p className="font-sans text-xl tracking-wider text-cocoa">{reservation.reference}</p>
          </div>
          <span className={cn("rounded-full px-4 py-1 font-sans text-sm", status.badgeClassName)}>
            {status.label}
          </span>
        </div>

        <dl className="mt-6 flex flex-col gap-4 font-sans text-sm text-cocoa">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="text-taupe">Rendez-vous</dt>
            <dd className="sm:text-right">
              <span className="first-letter:uppercase">{formatDay(reservation.date)}</span>,{" "}
              {formatSlotTime(reservation.start, reservation.end)}
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="text-taupe">Prestations</dt>
            <dd className="sm:text-right">{reservation.lines.map((line) => line.name).join(", ")}</dd>
          </div>
          {reservation.cancellationDeadline && (
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-taupe">Annulation en ligne</dt>
              <dd className="sm:text-right">
                {reservation.canCancel
                  ? `jusqu'au ${formatShortDay(reservation.cancellationDeadline)} inclus`
                  : "délai dépassé : contactez le salon"}
              </dd>
            </div>
          )}
        </dl>

        {accountCreated && (
          <p className="mt-6 border-t border-sand pt-6 font-sans text-sm text-cocoa">
            Votre compte RODIQ est créé avec l&apos;adresse {client.email}.
          </p>
        )}
      </div>

      <p className="mt-6 font-sans text-sm text-taupe">
        Conservez votre référence : elle vous sera demandée pour toute modification.
      </p>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/reservation/mes-reservations"
          className="inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Voir mes réservations
        </Link>
        <Link href="/" className="font-sans text-sm text-cocoa underline-offset-4 hover:underline">
          retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
};

"use client";

import Link from "next/link";
import { useState } from "react";
import { statusMeta, type ReservationStatus } from "@/lib/reservations";
import { useMyReservations } from "@/lib/stores/reservation-store";
import { cn } from "@/lib/utils";
import { ReservationCard } from "./reservation-card";

const filters: { value: ReservationStatus | null; label: string }[] = [
  { value: null, label: "Toutes" },
  ...(Object.keys(statusMeta) as ReservationStatus[]).map((value) => ({
    value,
    label: statusMeta[value].label,
  })),
];

// Historique des réservations, filtrable par statut
export const ReservationHistory = () => {
  const { loaded, signedIn, reservations, loadError, reload } = useMyReservations();
  const [status, setStatus] = useState<ReservationStatus | null>(null);

  // Session et réservations lues depuis l'API : rien à afficher côté serveur
  if (!loaded) return <div className="min-h-64" aria-hidden />;

  // Sans compte, pas de réservation : le bandeau au-dessus invite à se connecter
  if (!signedIn) return null;

  if (loadError) {
    return (
      <div role="alert" className="flex flex-col items-center py-12 text-center">
        <p className="font-serif text-[clamp(1.25rem,2vw,1.75rem)] text-cocoa">
          Vos réservations n&apos;ont pas pu être chargées.
        </p>
        <p className="mt-3 max-w-md font-sans text-sm text-taupe">{loadError}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-blush px-8 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <p className="font-serif text-[clamp(1.25rem,2vw,1.75rem)] text-cocoa">
          Vous n&apos;avez pas encore de réservation.
        </p>
        <p className="mt-3 max-w-md font-serif text-[clamp(1rem,1.3vw,1.15rem)] text-taupe italic">
          Choisissez vos prestations et réservez votre créneau en quelques instants.
        </p>
        <Link
          href="/prestations"
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Découvrir les prestations
        </Link>
      </div>
    );
  }

  const count = (value: ReservationStatus | null) =>
    value ? reservations.filter((r) => r.status === value).length : reservations.length;

  // Rendez-vous les plus récents en premier (ordre de l'API)
  const visible = reservations.filter((r) => !status || r.status === status);

  return (
    <>
      <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap justify-center gap-3">
        {filters.map((filter) => (
          <button
            key={filter.value ?? "all"}
            type="button"
            onClick={() => setStatus(filter.value)}
            aria-pressed={status === filter.value}
            className={cn(
              "rounded-full border border-sand px-5 py-2 font-sans text-sm text-cocoa transition-colors hover:bg-sand",
              status === filter.value && "bg-sand",
            )}
          >
            {filter.label} <span className="text-taupe">({count(filter.value)})</span>
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <ul className="mt-12 flex flex-col gap-6">
          {visible.map((reservation) => (
            <li key={reservation.id}>
              <ReservationCard reservation={reservation} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-16 text-center font-serif text-[clamp(1.1rem,1.5vw,1.35rem)] text-taupe italic">
          Aucune réservation avec ce statut.
        </p>
      )}

      <div className="mt-16 flex flex-col items-center gap-4 border-t border-sand pt-12 text-center">
        <p className="font-serif text-lg text-cocoa">Envie d&apos;un nouveau soin ?</p>
        <Link
          href="/reservation"
          className="inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Nouvelle réservation
        </Link>
      </div>
    </>
  );
};

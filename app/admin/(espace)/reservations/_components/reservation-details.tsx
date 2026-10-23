"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/admin/admin-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatPrice, type Prestation } from "@/lib/prestations";
import { contactChannels, formatDay, formatSlotTime, type Reservation } from "@/lib/reservations";

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-6">
    <dt className="text-taupe">{label}</dt>
    <dd className="sm:text-right">{children}</dd>
  </div>
);

// Fiche complète d'une réservation : coordonnées, prestations, motifs
export const ReservationDetails = ({
  reservation,
  prestations,
}: {
  reservation: Reservation;
  prestations: Prestation[];
}) => {
  const { client } = reservation;
  const items = prestations.filter((p) => reservation.prestationIds.includes(p.id));
  const total = items.reduce((sum, p) => sum + p.price, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="font-sans text-xs text-cocoa underline underline-offset-4 hover:text-taupe">
          Détails
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[90svh] gap-0 overflow-y-auto rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-lg md:p-8">
        <div className="flex items-start justify-between gap-4 pr-6">
          <div>
            <DialogTitle className="font-serif text-xl leading-tight font-normal">
              {client.firstName} {client.lastName}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-taupe">Réf. {reservation.reference}</DialogDescription>
          </div>
          <StatusBadge status={reservation.status} />
        </div>

        <dl className="mt-6 flex flex-col gap-3 border-t border-sand pt-6 text-sm">
          <Row label="Rendez-vous">
            <span className="first-letter:uppercase">{formatDay(reservation.date)}</span>,{" "}
            {formatSlotTime(reservation.start, reservation.end)}
          </Row>
          <Row label="Téléphone">
            <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="underline underline-offset-4">
              {client.phone}
            </a>
          </Row>
          {client.whatsapp && <Row label="WhatsApp">{client.whatsapp}</Row>}
          {client.email && (
            <Row label="E-mail">
              <a href={`mailto:${client.email}`} className="underline underline-offset-4">
                {client.email}
              </a>
            </Row>
          )}
          <Row label="Contact préféré">
            {contactChannels.find((c) => c.value === client.contactChannel)?.label}
          </Row>
          <Row label="Compte cliente">
            {reservation.accountRequested ? "Créé avec cette réservation" : reservation.accountId ? "Oui" : "Sans compte"}
          </Row>
          <Row label="Demande reçue le">
            {format(new Date(reservation.createdAt), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
          </Row>
        </dl>

        <ul className="mt-6 flex flex-col gap-2 border-t border-sand pt-6 text-sm">
          {items.map((p) => (
            <li key={p.id} className="flex justify-between gap-4">
              <span>{p.name}</span>
              <span className="whitespace-nowrap">{formatPrice(p.price, p.fromPrice)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-4 pt-2 font-serif text-base">
            <span>Total estimé</span>
            <span className="font-sans">{formatPrice(total, items.some((p) => p.fromPrice))}</span>
          </li>
        </ul>

        {(reservation.note || reservation.rejectionReason || reservation.cancellationReason) && (
          <div className="mt-6 flex flex-col gap-3 border-t border-sand pt-6 text-sm">
            {reservation.note && (
              <p>
                <span className="block text-taupe">Précision de la cliente</span>
                {reservation.note}
              </p>
            )}
            {reservation.rejectionReason && (
              <p>
                <span className="block text-taupe">Motif du refus</span>
                {reservation.rejectionReason}
              </p>
            )}
            {reservation.cancellationReason && (
              <p>
                <span className="block text-taupe">Motif de l&apos;annulation</span>
                {reservation.cancellationReason}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

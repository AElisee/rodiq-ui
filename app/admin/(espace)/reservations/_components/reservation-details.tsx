"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AdminBackLink, DetailNotFound, DetailPanel, DetailRow } from "@/components/admin/admin-detail";
import { AdminPageHeader, StatusBadge } from "@/components/admin/admin-ui";
import { AdminDetailSkeleton } from "@/components/admin/admin-skeleton";
import { formatPrice } from "@/lib/prestations";
import {
  contactChannels,
  formatDay,
  formatSlotTime,
  hasFromPrice,
  reservationTotal,
  toDateKey,
} from "@/lib/reservations";
import { useAdminReservationsStore } from "@/lib/stores/admin-reservations-store";
import { ReservationActions } from "./reservation-actions";

const formatDateTime = (iso: string) => format(new Date(iso), "d MMMM yyyy 'à' HH'h'mm", { locale: fr });

// Fiche complète d'une réservation : rendez-vous, prestations, coordonnées, motifs et actions
export const ReservationDetails = ({ id }: { id: string }) => {
  const reservation = useAdminReservationsStore((s) => s.details[id]);
  const error = useAdminReservationsStore((s) => s.detailErrors[id]);
  const loadDetail = useAdminReservationsStore((s) => s.loadDetail);

  // Relue à chaque ouverture : la réservation a pu changer depuis la liste
  useEffect(() => {
    void loadDetail(id);
  }, [id, loadDetail]);

  if (error?.status === 404)
    return (
      <div className="flex flex-col gap-6 pt-6">
        <AdminBackLink href="/admin/reservations">Réservations</AdminBackLink>
        <DetailNotFound title="Cette réservation est introuvable." href="/admin/reservations" label="Retour aux réservations" />
      </div>
    );

  if (error && !reservation)
    return (
      <div className="flex flex-col gap-6 pt-6">
        <AdminBackLink href="/admin/reservations">Réservations</AdminBackLink>
        <div role="alert" className="rounded-[var(--radius)] border border-sand p-6 font-sans text-sm text-cocoa">
          <p className="font-serif text-lg">La réservation n&apos;a pas pu être chargée.</p>
          <p className="mt-2 text-taupe">{error.message}</p>
          <button type="button" onClick={() => void loadDetail(id)} className="mt-4 underline underline-offset-4">
            Réessayer
          </button>
        </div>
      </div>
    );

  if (!reservation) return <AdminDetailSkeleton />;

  const { client } = reservation;
  const isToday = reservation.date === toDateKey(new Date());

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`${client.firstName} ${client.lastName}`}
        description={`Réf. ${reservation.reference} · demande reçue le ${formatDateTime(reservation.createdAt)}`}
      >
        <StatusBadge status={reservation.status} />
        <ReservationActions reservation={reservation} />
      </AdminPageHeader>

      <AdminBackLink href="/admin/reservations">Toutes les réservations</AdminBackLink>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailPanel title="Rendez-vous">
            <p className="font-serif text-2xl first-letter:uppercase">
              {formatDay(reservation.date)}
              {isToday && (
                <span className="ml-3 rounded-full bg-cocoa px-2 py-0.5 align-middle font-sans text-xs text-pearl">
                  aujourd&apos;hui
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-taupe">{formatSlotTime(reservation.start, reservation.end)}</p>

            <ul className="mt-6 flex flex-col gap-2 border-t border-sand pt-4 text-sm">
              {reservation.lines.map((line) => (
                <li key={line.prestationId} className="flex justify-between gap-4">
                  <span>{line.name}</span>
                  <span className="whitespace-nowrap">{formatPrice(line.price, line.fromPrice)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-4 border-t border-sand pt-3 font-serif text-lg">
                <span>Total estimé</span>
                <span className="font-sans">{formatPrice(reservationTotal(reservation), hasFromPrice(reservation))}</span>
              </li>
            </ul>
          </DetailPanel>

          {(reservation.note || reservation.rejectionReason || reservation.cancellationReason) && (
            <DetailPanel title="Remarques">
              <div className="flex flex-col gap-4 text-sm">
                {reservation.note && (
                  <p>
                    <span className="block text-taupe">Précision du client ou de la cliente</span>
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
            </DetailPanel>
          )}
        </div>

        <DetailPanel title="Client(e)">
          <dl className="flex flex-col gap-3 text-sm">
            <DetailRow label="Nom">
              {client.firstName} {client.lastName}
            </DetailRow>
            <DetailRow label="Téléphone">
              <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="underline underline-offset-4">
                {client.phone}
              </a>
            </DetailRow>
            {client.whatsapp && <DetailRow label="WhatsApp">{client.whatsapp}</DetailRow>}
            {client.email && (
              <DetailRow label="E-mail">
                <a href={`mailto:${client.email}`} className="underline underline-offset-4">
                  {client.email}
                </a>
              </DetailRow>
            )}
            <DetailRow label="Contact préféré">
              {contactChannels.find((c) => c.value === client.contactChannel)?.label}
            </DetailRow>
            {reservation.processedAt && (
              <DetailRow label="Dernier traitement">{formatDateTime(reservation.processedAt)}</DetailRow>
            )}
          </dl>
        </DetailPanel>
      </div>
    </div>
  );
};

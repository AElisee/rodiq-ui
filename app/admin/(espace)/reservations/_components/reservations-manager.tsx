"use client";

import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import {
  AdminPageHeader,
  AdminPager,
  StatusBadge,
  adminInputClassName,
  adminSmallButtonClassName,
  adminSmallOutlineButtonClassName,
  chipClassName,
  normalizeSearch,
} from "@/components/admin/admin-ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reservationTotal } from "@/lib/admin-stats";
import { formatPrice } from "@/lib/prestations";
import {
  contactChannels,
  formatDay,
  formatSlotTime,
  statusMeta,
  toDateKey,
  type Reservation,
  type ReservationStatus,
} from "@/lib/reservations";
import { useAllPrestations } from "@/lib/stores/catalog-store";
import { useReservationStore, useReservationsHydrated } from "@/lib/stores/reservation-store";
import { RejectDialog } from "./reject-dialog";
import { ReservationDetails } from "./reservation-details";

const PAGE_SIZE = 20;

type When = "a-venir" | "passees" | "toutes";

const whenFilters: { value: When; label: string }[] = [
  { value: "a-venir", label: "À venir" },
  { value: "passees", label: "Passées" },
  { value: "toutes", label: "Toutes les dates" },
];

const statusFilters: { value: ReservationStatus | null; label: string }[] = [
  { value: null, label: "Tous les statuts" },
  ...(Object.keys(statusMeta) as ReservationStatus[]).map((value) => ({
    value,
    label: statusMeta[value].label,
  })),
];

// Liste des réservations : filtres, recherche et actions (confirmer, refuser, terminer)
export const ReservationsManager = () => {
  const hydrated = useReservationsHydrated();
  const reservations = useReservationStore((s) => s.reservations);
  const confirm = useReservationStore((s) => s.confirm);
  const complete = useReservationStore((s) => s.complete);
  const prestations = useAllPrestations();
  const [status, setStatus] = useState<ReservationStatus | null>("en_attente");
  const [when, setWhen] = useState<When>("a-venir");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const search = normalizeSearch(useDeferredValue(query));

  if (!hydrated) return <div className="min-h-96" aria-hidden />;

  const today = toDateKey(new Date());
  const inWhen = (r: Reservation) =>
    when === "toutes" || (when === "a-venir" ? r.date >= today : r.date < today);
  const matches = (r: Reservation) =>
    !search ||
    normalizeSearch(
      `${r.client.firstName} ${r.client.lastName} ${r.client.phone} ${r.client.email ?? ""} ${r.reference}`,
    ).includes(search);

  const base = reservations.filter((r) => inWhen(r) && matches(r));
  const count = (value: ReservationStatus | null) =>
    value ? base.filter((r) => r.status === value).length : base.length;

  // À venir : les plus proches d'abord ; sinon les plus récentes d'abord
  const filtered = base
    .filter((r) => !status || r.status === status)
    .toSorted((a, b) => {
      const order = `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`);
      return when === "a-venir" ? order : -order;
    });

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleConfirm = (r: Reservation) => {
    confirm(r.id);
    toast.success("Réservation confirmée", {
      description: `${r.client.firstName} ${r.client.lastName} · ${formatSlotTime(r.start, r.end)}`,
    });
  };

  const handleComplete = (r: Reservation) => {
    complete(r.id);
    toast.success("Soin marqué comme terminé", { description: `${r.client.firstName} ${r.client.lastName}` });
  };

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Réservations"
        description="Confirmez ou refusez les demandes, puis marquez les soins terminés."
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-taupe" strokeWidth={1.75} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => resetPage(setQuery)(e.target.value)}
              placeholder="Nom, téléphone, e-mail ou référence"
              aria-label="Rechercher une réservation"
              className={`${adminInputClassName} pl-10`}
            />
          </div>
          <div role="group" aria-label="Dates" className="flex flex-wrap gap-2">
            {whenFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => resetPage(setWhen)(filter.value)}
                aria-pressed={when === filter.value}
                className={chipClassName(when === filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value ?? "all"}
              type="button"
              onClick={() => resetPage(setStatus)(filter.value)}
              aria-pressed={status === filter.value}
              className={chipClassName(status === filter.value)}
            >
              {filter.label} <span className="text-taupe">({count(filter.value)})</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length > 0 ? (
        <>
          <div className="rounded-[var(--radius)] border border-sand">
            <Table className="font-sans text-cocoa">
              <TableHeader>
                <TableRow className="border-sand hover:bg-transparent">
                  <TableHead className="px-4 text-taupe">Rendez-vous</TableHead>
                  <TableHead className="px-4 text-taupe">Cliente</TableHead>
                  <TableHead className="px-4 text-taupe">Prestations</TableHead>
                  <TableHead className="px-4 text-taupe">Statut</TableHead>
                  <TableHead className="px-4 text-right text-taupe">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => {
                  const items = prestations.filter((p) => r.prestationIds.includes(p.id));
                  const isPast = r.date < today;
                  return (
                    <TableRow key={r.id} className="border-sand hover:bg-transparent">
                      <TableCell className="px-4 py-3 align-top">
                        <p className="first-letter:uppercase">
                          {formatDay(r.date)}
                          {r.date === today && (
                            <span className="ml-2 rounded-full bg-cocoa px-2 py-0.5 text-xs text-pearl">aujourd&apos;hui</span>
                          )}
                        </p>
                        <p className="text-xs text-taupe">
                          {formatSlotTime(r.start, r.end)} · {r.reference}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <p>
                          {r.client.firstName} {r.client.lastName}
                        </p>
                        <p className="text-xs text-taupe">
                          {r.client.phone} · {contactChannels.find((c) => c.value === r.client.contactChannel)?.label}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-64 px-4 py-3 align-top whitespace-normal">
                        <p>{items.map((p) => p.name).join(", ")}</p>
                        <p className="text-xs text-taupe">
                          {formatPrice(reservationTotal(r, prestations), items.some((p) => p.fromPrice))}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {r.status === "en_attente" && (
                            <>
                              <button type="button" onClick={() => handleConfirm(r)} className={adminSmallButtonClassName}>
                                Confirmer
                              </button>
                              <RejectDialog reservation={r} />
                            </>
                          )}
                          {r.status === "confirmee" &&
                            (isPast || r.date === today ? (
                              <button type="button" onClick={() => handleComplete(r)} className={adminSmallButtonClassName}>
                                Soin terminé
                              </button>
                            ) : (
                              <RejectDialog reservation={r} />
                            ))}
                          <ReservationDetails reservation={r} prestations={prestations} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <AdminPager page={currentPage} pageCount={pageCount} onPageChange={setPage} />
        </>
      ) : (
        <div className="flex flex-col items-center rounded-[var(--radius)] border border-sand py-16 text-center">
          <p className="font-serif text-lg text-cocoa">Aucune réservation ne correspond à ces filtres.</p>
          <button
            type="button"
            onClick={() => {
              setStatus(null);
              setWhen("toutes");
              setQuery("");
            }}
            className={`mt-6 ${adminSmallOutlineButtonClassName}`}
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
};

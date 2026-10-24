"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import {
  ADMIN_PAGE_SIZE,
  AdminPageHeader,
  AdminPager,
  AdminSelect,
  StatusBadge,
  adminInputClassName,
  adminSmallOutlineButtonClassName,
  normalizeSearch,
} from "@/components/admin/admin-ui";
import { detailLinkClassName } from "@/components/admin/admin-detail";
import { AdminExportButtons, type ExportTable } from "@/components/admin/admin-export";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/prestations";
import {
  contactChannels,
  formatDay,
  formatSlotTime,
  hasFromPrice,
  reservationTotal,
  statusMeta,
  toDateKey,
  type Reservation,
  type ReservationStatus,
} from "@/lib/reservations";
import { useReservationStore, useReservationsHydrated } from "@/lib/stores/reservation-store";
import { ReservationActions } from "./reservation-actions";

type When = "a-venir" | "passees" | "toutes";

const whenFilters: { value: When; label: string }[] = [
  { value: "toutes", label: "Toutes les dates" },
  { value: "passees", label: "Passées" },
  { value: "a-venir", label: "À venir" },
];

type SortOrder = "date-asc" | "date-desc" | "demande" | "nom";

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "date-asc", label: "Rendez-vous les plus proches" },
  { value: "date-desc", label: "Rendez-vous les plus récents" },
  { value: "demande", label: "Demandes récentes" },
  { value: "nom", label: "Nom" },
];

const statusFilters:{ value: ReservationStatus | null; label: string }[] = [
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
  const [status, setStatus] = useState<ReservationStatus | null>("en_attente");
  const [when, setWhen] = useState<When>("a-venir");
  const [sort, setSort] = useState<SortOrder>("date-asc");
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

  const slotKey = (r: Reservation) => `${r.date} ${r.start}`;
  const filtered = base
    .filter((r) => !status || r.status === status)
    .toSorted((a, b) => {
      if (sort === "date-desc") return slotKey(b).localeCompare(slotKey(a));
      if (sort === "demande") return b.createdAt.localeCompare(a.createdAt);
      if (sort === "nom")
        return `${a.client.lastName} ${a.client.firstName}`.localeCompare(`${b.client.lastName} ${b.client.firstName}`, "fr");
      return slotKey(a).localeCompare(slotKey(b));
    });

  const exportTable: ExportTable = {
    title: "Réservations",
    filename: "reservations",
    headers: ["Référence", "Date", "Horaire", "Client(e)", "Téléphone", "E-mail", "Contact", "Prestations", "Montant (FCFA)", "Statut", "Note"],
    rows: filtered.map((r) => [
      r.reference,
      r.date,
      formatSlotTime(r.start, r.end),
      `${r.client.firstName} ${r.client.lastName}`,
      r.client.phone,
      r.client.email ?? "",
      contactChannels.find((c) => c.value === r.client.contactChannel)?.label ?? "",
      r.lines.map((line) => line.name).join(", "),
      reservationTotal(r),
      statusMeta[r.status].label,
      r.note ?? "",
    ]),
  };

  const pageCount = Math.ceil(filtered.length / ADMIN_PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const visible = filtered.slice((currentPage - 1) * ADMIN_PAGE_SIZE, currentPage * ADMIN_PAGE_SIZE);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Réservations"
        description="Confirmez ou refusez les demandes, puis marquez les soins terminés."
      >
        <AdminExportButtons table={exportTable} />
      </AdminPageHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-sm">
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
          <div className="grid gap-3 sm:grid-cols-3 xl:w-auto">
            <AdminSelect
              label="Dates"
              value={when}
              onValueChange={resetPage(setWhen)}
              options={whenFilters}
              className="xl:w-44"
            />
            <AdminSelect
              label="Filtrer par statut"
              value={status ?? "all"}
              onValueChange={(v) => resetPage(setStatus)(v === "all" ? null : (v as ReservationStatus))}
              options={statusFilters.map((filter) => ({
                value: filter.value ?? "all",
                label: `${filter.label} (${count(filter.value)})`,
              }))}
              className="xl:w-52"
            />
            <AdminSelect
              label="Trier par"
              value={sort}
              onValueChange={resetPage(setSort)}
              options={sortOptions}
              className="xl:w-56"
            />
          </div>
        </div>
      </div>

      {visible.length > 0 ? (
        <>
          <div className="rounded-[var(--radius)] border border-sand">
            <Table className="font-sans text-cocoa">
              <TableHeader>
                <TableRow className="border-sand hover:bg-transparent">
                  <TableHead className="w-12 px-4 text-right text-taupe">#</TableHead>
                  <TableHead className="px-4 text-taupe">Rendez-vous</TableHead>
                  <TableHead className="px-4 text-taupe">Client(e)</TableHead>
                  <TableHead className="px-4 text-taupe">Prestations</TableHead>
                  <TableHead className="px-4 text-taupe">Statut</TableHead>
                  <TableHead className="px-4 text-right text-taupe">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r, index) => {
                  return (
                    <TableRow key={r.id} className="border-sand hover:bg-transparent">
                      <TableCell className="px-4 py-3 text-right align-top text-taupe tabular-nums">{(currentPage - 1) * ADMIN_PAGE_SIZE + index + 1}</TableCell>
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
                        <p>{r.lines.map((line) => line.name).join(", ")}</p>
                        <p className="text-xs text-taupe">
                          {formatPrice(reservationTotal(r), hasFromPrice(r))}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <ReservationActions reservation={r} />
                          <Link href={`/admin/reservations/${r.id}`} className={detailLinkClassName}>
                            Détails
                          </Link>
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

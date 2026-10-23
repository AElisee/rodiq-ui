"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import {
  AdminPageHeader,
  AdminPager,
  StatusBadge,
  adminInputClassName,
  normalizeSearch,
} from "@/components/admin/admin-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reservationTotal } from "@/lib/admin-stats";
import { formatPrice } from "@/lib/prestations";
import { formatDay, formatSlotTime, type Reservation } from "@/lib/reservations";
import { useAuthHydrated, useAuthStore, type Account } from "@/lib/stores/auth-store";
import { useAllPrestations } from "@/lib/stores/catalog-store";
import { useReservationStore, useReservationsHydrated } from "@/lib/stores/reservation-store";

const PAGE_SIZE = 20;

type SortOrder = "recentes" | "nom" | "reservations";

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "recentes", label: "Inscription récente" },
  { value: "nom", label: "Nom" },
  { value: "reservations", label: "Nombre de réservations" },
];

const formatDate = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: fr });

// Historique des réservations d'une cliente
const AccountHistory = ({ account, reservations }: { account: Account; reservations: Reservation[] }) => (
  <Dialog>
    <DialogTrigger asChild>
      <button type="button" className="font-sans text-xs text-cocoa underline underline-offset-4 hover:text-taupe">
        Historique
      </button>
    </DialogTrigger>
    <DialogContent className="max-h-[90svh] gap-0 overflow-y-auto rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-lg md:p-8">
      <DialogTitle className="font-serif text-xl leading-tight font-normal">
        {account.firstName} {account.lastName}
      </DialogTitle>
      <DialogDescription className="mt-1 text-sm text-taupe">
        {account.email} · {account.phone}
      </DialogDescription>
      {reservations.length > 0 ? (
        <ul className="mt-6 divide-y divide-sand border-t border-sand text-sm">
          {reservations.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="first-letter:uppercase">{formatDay(r.date)}</p>
                <p className="text-xs text-taupe">
                  {formatSlotTime(r.start, r.end)} · {r.reference}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 border-t border-sand pt-6 text-sm text-taupe">Aucune réservation pour le moment.</p>
      )}
    </DialogContent>
  </Dialog>
);

// Comptes clientes avec leur activité (réservations, dépenses estimées)
export const UsersList = () => {
  const authHydrated = useAuthHydrated();
  const reservationsHydrated = useReservationsHydrated();
  const accounts = useAuthStore((s) => s.accounts);
  const reservations = useReservationStore((s) => s.reservations);
  const prestations = useAllPrestations();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("recentes");
  const [page, setPage] = useState(1);
  const search = normalizeSearch(useDeferredValue(query));

  if (!authHydrated || !reservationsHydrated) return <div className="min-h-96" aria-hidden />;

  const rows = accounts
    .map((account) => {
      const own = reservations
        .filter((r) => r.accountId === account.id)
        .toSorted((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`));
      const spent = own
        .filter((r) => r.status === "terminee")
        .reduce((sum, r) => sum + reservationTotal(r, prestations), 0);
      return { account, reservations: own, spent };
    })
    .filter(
      ({ account }) =>
        !search ||
        normalizeSearch(`${account.firstName} ${account.lastName} ${account.email} ${account.phone}`).includes(search),
    )
    .toSorted((a, b) => {
      if (sort === "nom") return `${a.account.lastName} ${a.account.firstName}`.localeCompare(`${b.account.lastName} ${b.account.firstName}`, "fr");
      if (sort === "reservations") return b.reservations.length - a.reservations.length;
      return b.account.createdAt.localeCompare(a.account.createdAt);
    });

  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Clientes"
        description={`${accounts.length} compte${accounts.length > 1 ? "s" : ""} client${accounts.length > 1 ? "s" : ""}`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-taupe" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Nom, e-mail ou téléphone"
            aria-label="Rechercher une cliente"
            className={`${adminInputClassName} pl-10`}
          />
        </div>
        <label className="flex items-center gap-3 font-sans text-sm text-taupe">
          Trier par
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
            className={`${adminInputClassName} w-auto pr-8`}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length > 0 ? (
        <>
          <div className="rounded-[var(--radius)] border border-sand">
            <Table className="font-sans text-cocoa">
              <TableHeader>
                <TableRow className="border-sand hover:bg-transparent">
                  <TableHead className="px-4 text-taupe">Cliente</TableHead>
                  <TableHead className="px-4 text-taupe">Contact</TableHead>
                  <TableHead className="px-4 text-taupe">Inscrite le</TableHead>
                  <TableHead className="px-4 text-right text-taupe">Réservations</TableHead>
                  <TableHead className="px-4 text-taupe">Dernier rendez-vous</TableHead>
                  <TableHead className="px-4 text-right text-taupe">Dépenses estimées</TableHead>
                  <TableHead className="px-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(({ account, reservations: own, spent }) => (
                  <TableRow key={account.id} className="border-sand hover:bg-transparent">
                    <TableCell className="px-4 py-3">
                      {account.firstName} {account.lastName}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <p>{account.email}</p>
                      <p className="text-xs text-taupe">{account.phone}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3">{formatDate(account.createdAt)}</TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums">{own.length}</TableCell>
                    <TableCell className="px-4 py-3">
                      {own[0] ? (
                        <span className="first-letter:uppercase">{formatDate(`${own[0].date}T00:00`)}</span>
                      ) : (
                        <span className="text-taupe">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right whitespace-nowrap">{formatPrice(spent)}</TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <AccountHistory account={account} reservations={own} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <AdminPager page={currentPage} pageCount={pageCount} onPageChange={setPage} />
        </>
      ) : (
        <p className="rounded-[var(--radius)] border border-sand py-16 text-center font-serif text-lg text-cocoa">
          Aucune cliente ne correspond à votre recherche.
        </p>
      )}
    </div>
  );
};

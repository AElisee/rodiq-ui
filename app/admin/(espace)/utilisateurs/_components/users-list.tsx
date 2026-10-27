"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import {
  ADMIN_PAGE_SIZE,
  AdminPageHeader,
  AdminPager,
  AdminSelect,
  OrderStatusBadge,
  StatusBadge,
  adminInputClassName,
  normalizeSearch,
} from "@/components/admin/admin-ui";
import { AdminExportButtons, type ExportTable } from "@/components/admin/admin-export";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orderItemCount, orderTotal, type Order } from "@/lib/commandes";
import { formatPrice } from "@/lib/prestations";
import { formatDay, formatSlotTime, reservationTotal, type Reservation } from "@/lib/reservations";
import { demoClientAccounts } from "@/lib/demo-data";
import type { Account } from "@/lib/stores/auth-store";
import { useOrderStore, useOrdersHydrated } from "@/lib/stores/order-store";
import { useAdminReservationsStore, useAllReservationsLoaded } from "@/lib/stores/admin-reservations-store";

type SortOrder = "recentes" | "nom" | "reservations" | "commandes" | "depenses";

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "recentes", label: "Inscription récente" },
  { value: "nom", label: "Nom" },
  { value: "reservations", label: "Nombre de réservations" },
  { value: "commandes", label: "Nombre de commandes" },
  { value: "depenses", label: "Dépenses" },
];

const formatDate = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: fr });

const historyTitleClassName = "mt-6 font-serif text-lg";
const historyLinkClassName = "underline-offset-4 hover:underline";

// Historique d'un compte : réservations et commandes, avec accès à leur fiche
const AccountHistory = ({
  account,
  reservations,
  orders,
}: {
  account: Account;
  reservations: Reservation[];
  orders: Order[];
}) => (
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

      <h3 className={historyTitleClassName}>Réservations</h3>
      {reservations.length > 0 ? (
        <ul className="mt-3 divide-y divide-sand border-t border-sand text-sm">
          {reservations.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <Link href={`/admin/reservations/${r.id}`} className={historyLinkClassName}>
                  <span className="inline-block first-letter:uppercase">{formatDay(r.date)}</span>
                </Link>
                <p className="text-xs text-taupe">
                  {formatSlotTime(r.start, r.end)} · {r.reference}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-sand pt-3 text-sm text-taupe">Aucune réservation pour le moment.</p>
      )}

      <h3 className={historyTitleClassName}>Commandes</h3>
      {orders.length > 0 ? (
        <ul className="mt-3 divide-y divide-sand border-t border-sand text-sm">
          {orders.map((o) => {
            const count = orderItemCount(o);
            return (
              <li key={o.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Link href={`/admin/commandes/${o.id}`} className={historyLinkClassName}>
                    {o.reference}
                  </Link>
                  <p className="text-xs text-taupe">
                    {formatDate(o.createdAt)} · {count} article{count > 1 && "s"} · {formatPrice(orderTotal(o))}
                  </p>
                </div>
                <OrderStatusBadge order={o} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 border-t border-sand pt-3 text-sm text-taupe">Aucune commande pour le moment.</p>
      )}
    </DialogContent>
  </Dialog>
);

// Comptes clients avec leur activité (réservations, commandes, dépenses)
export const UsersList = () => {
  const reservationsHydrated = useAllReservationsLoaded();
  const ordersHydrated = useOrdersHydrated();
  // Comptes de démonstration en attendant une route API qui liste les comptes (GET /admin/comptes)
  const accounts = demoClientAccounts;
  const reservations = useAdminReservationsStore((s) => s.all);
  const orders = useOrderStore((s) => s.orders);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("recentes");
  const [page, setPage] = useState(1);
  const search = normalizeSearch(useDeferredValue(query));

  if (!reservationsHydrated || !ordersHydrated) return <div className="min-h-96" aria-hidden />;

  const rows = accounts
    .map((account) => {
      const own = reservations
        .filter((r) => r.accountId === account.id)
        .toSorted((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`));
      const ownOrders = orders
        .filter((o) => o.accountId === account.id)
        .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
      // Soins terminés (montant estimé) + commandes remises
      const spent =
        own.filter((r) => r.status === "terminee").reduce((sum, r) => sum + reservationTotal(r), 0) +
        ownOrders.filter((o) => o.status === "livree").reduce((sum, o) => sum + orderTotal(o), 0);
      return { account, reservations: own, orders: ownOrders, spent };
    })
    .filter(
      ({ account }) =>
        !search ||
        normalizeSearch(`${account.firstName} ${account.lastName} ${account.email} ${account.phone}`).includes(search),
    )
    .toSorted((a, b) => {
      if (sort === "nom") return `${a.account.lastName} ${a.account.firstName}`.localeCompare(`${b.account.lastName} ${b.account.firstName}`, "fr");
      if (sort === "reservations") return b.reservations.length - a.reservations.length;
      if (sort === "commandes") return b.orders.length - a.orders.length;
      if (sort === "depenses") return b.spent - a.spent;
      return b.account.createdAt.localeCompare(a.account.createdAt);
    });

  const pageCount = Math.ceil(rows.length / ADMIN_PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const visible = rows.slice((currentPage - 1) * ADMIN_PAGE_SIZE, currentPage * ADMIN_PAGE_SIZE);

  const exportTable: ExportTable = {
    title: "Clientèle",
    filename: "clientele",
    headers: [
      "Prénom",
      "Nom",
      "E-mail",
      "Téléphone",
      "Inscription",
      "Réservations",
      "Dernier rendez-vous",
      "Commandes",
      "Dépenses estimées (FCFA)",
    ],
    rows: rows.map(({ account, reservations: own, orders: ownOrders, spent }) => [
      account.firstName,
      account.lastName,
      account.email,
      account.phone,
      formatDate(account.createdAt),
      own.length,
      own[0] ? formatDate(`${own[0].date}T00:00`) : "",
      ownOrders.length,
      spent,
    ]),
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Clientèle"
        description={`${accounts.length} compte${accounts.length > 1 ? "s" : ""} client${accounts.length > 1 ? "s" : ""}`}
      >
        <AdminExportButtons table={exportTable} />
      </AdminPageHeader>

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
            aria-label="Rechercher un compte client"
            className={`${adminInputClassName} pl-10`}
          />
        </div>
        <div className="flex items-center gap-3 font-sans text-sm text-taupe">
          <span className="shrink-0">Trier par</span>
          <AdminSelect
            label="Trier par"
            value={sort}
            onValueChange={setSort}
            options={sortOptions}
            className="sm:w-56"
          />
        </div>
      </div>

      {visible.length > 0 ? (
        <>
          <div className="rounded-[var(--radius)] border border-sand">
            <Table className="font-sans text-cocoa">
              <TableHeader>
                <TableRow className="border-sand hover:bg-transparent">
                  <TableHead className="w-12 px-4 text-right text-taupe">#</TableHead>
                  <TableHead className="px-4 text-taupe">Client(e)</TableHead>
                  <TableHead className="px-4 text-taupe">Contact</TableHead>
                  <TableHead className="px-4 text-taupe">Inscription</TableHead>
                  <TableHead className="px-4 text-right text-taupe">Réservations</TableHead>
                  <TableHead className="px-4 text-taupe">Dernier rendez-vous</TableHead>
                  <TableHead className="px-4 text-right text-taupe">Commandes</TableHead>
                  <TableHead className="px-4 text-right text-taupe">Dépenses estimées</TableHead>
                  <TableHead className="px-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(({ account, reservations: own, orders: ownOrders, spent }, index) => (
                  <TableRow key={account.id} className="border-sand hover:bg-transparent">
                    <TableCell className="px-4 py-3 text-right align-top text-taupe tabular-nums">{(currentPage - 1) * ADMIN_PAGE_SIZE + index + 1}</TableCell>
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
                    <TableCell className="px-4 py-3 text-right tabular-nums">{ownOrders.length}</TableCell>
                    <TableCell className="px-4 py-3 text-right whitespace-nowrap">{formatPrice(spent)}</TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <AccountHistory account={account} reservations={own} orders={ownOrders} />
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
          Aucun compte ne correspond à votre recherche.
        </p>
      )}
    </div>
  );
};

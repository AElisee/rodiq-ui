"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import {
  ADMIN_PAGE_SIZE,
  AdminPageHeader,
  AdminPager,
  AdminSelect,
  OrderStatusBadge,
  StatusBadge,
  adminInputClassName,
} from "@/components/admin/admin-ui";
import { AdminExportButtons } from "@/components/admin/admin-export";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AccountsQuery, AccountsSort, ClientAccount } from "@/lib/api/comptes";
import { formatPrice } from "@/lib/prestations";
import { formatDay, formatSlotTime } from "@/lib/reservations";
import { useAdminAccountsStore } from "@/lib/stores/admin-accounts-store";

const sortOptions: { value: AccountsSort; label: string }[] = [
  { value: "recentes", label: "Inscription récente" },
  { value: "nom", label: "Nom" },
  { value: "reservations", label: "Nombre de réservations" },
  { value: "commandes", label: "Nombre de commandes" },
  { value: "depenses", label: "Dépenses" },
];

const formatDate = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: fr });

const historyTitleClassName = "mt-6 font-serif text-lg";
const historyLinkClassName = "underline-offset-4 hover:underline";

const exportHeaders = [
  "Prénom",
  "Nom",
  "E-mail",
  "Téléphone",
  "Inscription",
  "Réservations",
  "Dernier rendez-vous",
  "Commandes",
  "Dépenses estimées (FCFA)",
];

const exportRow = (a: ClientAccount) => [
  a.firstName,
  a.lastName,
  a.email,
  a.phone,
  formatDate(a.createdAt),
  a.reservationCount,
  a.lastAppointment ? formatDate(`${a.lastAppointment}T00:00`) : "",
  a.orderCount,
  a.estimatedSpend,
];

// Historique complet d'un compte, lu à l'ouverture : réservations et commandes, avec accès à leur fiche
const AccountHistoryContent = ({ id }: { id: string }) => {
  const detail = useAdminAccountsStore((s) => s.details[id]);
  const detailError = useAdminAccountsStore((s) => s.detailErrors[id]);
  const loadDetail = useAdminAccountsStore((s) => s.loadDetail);

  if (detailError && !detail)
    return (
      <div role="alert" className="mt-6 border-t border-sand pt-4 text-sm">
        <p>L&apos;historique n&apos;a pas pu être chargé.</p>
        <p className="mt-1 text-taupe">
          {detailError.status === 404
            ? "Ce compte est introuvable : il n'existe plus dans la base."
            : detailError.message}
        </p>
        {detailError.status !== 404 && (
          <button type="button" onClick={() => void loadDetail(id)} className="mt-3 underline underline-offset-4">
            Réessayer
          </button>
        )}
      </div>
    );

  if (!detail) return <div className="mt-6 min-h-40" aria-hidden />;

  return (
    <>
      <h3 className={historyTitleClassName}>Réservations</h3>
      {detail.reservations.length > 0 ? (
        <ul className="mt-3 divide-y divide-sand border-t border-sand text-sm">
          {detail.reservations.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <Link href={`/admin/reservations/${r.id}`} className={historyLinkClassName}>
                  <span className="inline-block first-letter:uppercase">{formatDay(r.date)}</span>
                </Link>
                <p className="text-xs text-taupe">
                  {formatSlotTime(r.start, r.end)} · {r.reference} · {formatPrice(r.total, r.totalFrom)}
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
      {detail.orders.length > 0 ? (
        <ul className="mt-3 divide-y divide-sand border-t border-sand text-sm">
          {detail.orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <Link href={`/admin/commandes/${o.id}`} className={historyLinkClassName}>
                  {o.reference}
                </Link>
                <p className="text-xs text-taupe">
                  {formatDate(o.createdAt)} · {o.itemCount} article{o.itemCount > 1 && "s"} · {formatPrice(o.total)}
                </p>
              </div>
              <OrderStatusBadge order={o} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-sand pt-3 text-sm text-taupe">Aucune commande pour le moment.</p>
      )}
    </>
  );
};

const AccountHistory = ({ account }: { account: ClientAccount }) => {
  const loadDetail = useAdminAccountsStore((s) => s.loadDetail);

  return (
    <Dialog
      onOpenChange={(open) => {
        // Relu à chaque ouverture : l'activité a pu changer depuis la dernière lecture
        if (open) void loadDetail(account.id);
      }}
    >
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
        <AccountHistoryContent id={account.id} />
      </DialogContent>
    </Dialog>
  );
};

// Comptes clients avec leur activité (réservations, commandes, dépenses) : recherche, tri et pagination
// faits par l'API
export const UsersList = () => {
  const page = useAdminAccountsStore((s) => s.page);
  const pageError = useAdminAccountsStore((s) => s.pageError);
  const loadPage = useAdminAccountsStore((s) => s.loadPage);
  const fetchMatching = useAdminAccountsStore((s) => s.fetchMatching);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<AccountsSort>("recentes");
  const [pageNumber, setPageNumber] = useState(1);
  const search = useDeferredValue(query);

  const filters: AccountsQuery = { search, sort, page: pageNumber, pageSize: ADMIN_PAGE_SIZE };
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    void loadPage(JSON.parse(filtersKey) as AccountsQuery);
  }, [filtersKey, loadPage]);

  if (!page && !pageError) return <div className="min-h-96" aria-hidden />;

  const total = page?.total ?? 0;
  const pageCount = Math.ceil(total / ADMIN_PAGE_SIZE);
  const currentPage = page?.page ?? pageNumber;
  const visible = page?.accounts ?? [];

  const loadExport = async () => ({
    title: "Clientèle",
    filename: "clientele",
    headers: exportHeaders,
    rows: (await fetchMatching({ search, sort })).map(exportRow),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Clientèle"
        description={
          page
            ? `${total} compte${total > 1 ? "s" : ""} client${total > 1 ? "s" : ""}${search.trim() ? " pour cette recherche" : ""}`
            : "Comptes clients et leur activité"
        }
      >
        <AdminExportButtons count={total} load={loadExport} />
      </AdminPageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-taupe" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPageNumber(1);
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
            onValueChange={(value) => {
              setSort(value);
              setPageNumber(1);
            }}
            options={sortOptions}
            className="sm:w-56"
          />
        </div>
      </div>

      {pageError ? (
        <div role="alert" className="rounded-[var(--radius)] border border-sand p-6 font-sans text-sm text-cocoa">
          <p className="font-serif text-lg">Les comptes clients n&apos;ont pas pu être chargés.</p>
          <p className="mt-2 text-taupe">{pageError}</p>
          <button type="button" onClick={() => void loadPage(filters)} className="mt-4 underline underline-offset-4">
            Réessayer
          </button>
        </div>
      ) : visible.length > 0 ? (
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
                {visible.map((account, index) => (
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
                    <TableCell className="px-4 py-3 text-right tabular-nums">{account.reservationCount}</TableCell>
                    <TableCell className="px-4 py-3">
                      {account.lastAppointment ? (
                        <span className="first-letter:uppercase">{formatDate(`${account.lastAppointment}T00:00`)}</span>
                      ) : (
                        <span className="text-taupe">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums">{account.orderCount}</TableCell>
                    <TableCell className="px-4 py-3 text-right whitespace-nowrap">{formatPrice(account.estimatedSpend)}</TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <AccountHistory account={account} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <AdminPager page={currentPage} pageCount={pageCount} onPageChange={setPageNumber} />
        </>
      ) : (
        <p className="rounded-[var(--radius)] border border-sand py-16 text-center font-serif text-lg text-cocoa">
          {search.trim() ? "Aucun compte ne correspond à votre recherche." : "Aucun compte client pour le moment."}
        </p>
      )}
    </div>
  );
};

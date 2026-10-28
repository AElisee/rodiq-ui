"use client";

import Link from "next/link";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import {
  ADMIN_PAGE_SIZE,
  AdminPageHeader,
  AdminPager,
  AdminPanel,
  AdminSelect,
  OrderStatusBadge,
  adminInputClassName,
  adminSmallOutlineButtonClassName,
} from "@/components/admin/admin-ui";
import { AdminListSkeleton, AdminStatsSkeleton, AdminTableSkeleton } from "@/components/admin/admin-skeleton";
import { detailLinkClassName } from "@/components/admin/admin-detail";
import { AdminExportButtons } from "@/components/admin/admin-export";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrdersQuery, OrdersSort } from "@/lib/api/commandes";
import {
  deliveryModes,
  isOpenOrder,
  orderDeliveryAddress,
  orderItemCount,
  orderStatusLabel,
  orderLineName,
  orderStatusMeta,
  orderTotal,
  paymentMethods,
  type DeliveryMode,
  type Order,
  type OrderStatus,
} from "@/lib/commandes";
import { formatPrice } from "@/lib/prestations";
import { useAdminOrdersStore, useAllOrdersLoaded } from "@/lib/stores/admin-orders-store";
import { OrderActions } from "./order-actions";

const statusFilters: { value: OrderStatus | null; label: string }[] = [
  { value: null, label: "Tous les statuts" },
  ...(Object.keys(orderStatusMeta) as OrderStatus[]).map((value) => ({
    value,
    label: orderStatusMeta[value].label,
  })),
];

const modeFilters: { value: DeliveryMode | "all"; label: string }[] = [
  { value: "all", label: "Livraison et retrait" },
  ...deliveryModes,
];

type PaymentFilter = NonNullable<OrdersQuery["payment"]>;

const paymentFilters: { value: PaymentFilter | "all"; label: string }[] = [
  { value: "all", label: "Tous les paiements" },
  { value: "payees", label: "Payées" },
  { value: "a-encaisser", label: "À encaisser" },
];

const sortOptions: { value: OrdersSort; label: string }[] = [
  { value: "recentes", label: "Plus récentes" },
  { value: "anciennes", label: "Plus anciennes" },
  { value: "total-desc", label: "Montant" },
  { value: "nom", label: "Nom" },
];

const StatTile = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
  <AdminPanel className="flex flex-col gap-1">
    <p className="font-sans text-sm text-taupe">{label}</p>
    <p className="font-serif text-2xl text-cocoa tabular-nums md:text-3xl">{value}</p>
    <p className="font-sans text-xs text-taupe">{hint}</p>
  </AdminPanel>
);

const customerName = (o: Order) => `${o.customer.firstName} ${o.customer.lastName}`;

const exportHeaders = ["Référence", "Date", "Client(e)", "Téléphone", "E-mail", "Articles", "Remise", "Adresse", "Livraison (FCFA)", "Total (FCFA)", "Paiement", "Payée", "Statut", "Note"];

const exportRow = (o: Order) => [
  o.reference,
  format(new Date(o.createdAt), "yyyy-MM-dd HH:mm"),
  customerName(o),
  o.customer.phone,
  o.customer.email,
  o.lines.map((l) => `${orderLineName(l)} × ${l.quantity}`).join(", "),
  deliveryModes.find((m) => m.value === o.delivery.mode)?.label ?? "",
  orderDeliveryAddress(o),
  o.deliveryFee,
  orderTotal(o),
  paymentMethods.find((m) => m.value === o.paymentMethod)?.label ?? "",
  o.paid ? "Oui" : "Non",
  orderStatusLabel(o),
  o.note ?? "",
];

// Indicateurs calculés sur toutes les commandes (lues page après page)
const OrderStats = () => {
  const loaded = useAllOrdersLoaded();
  const orders = useAdminOrdersStore((s) => s.all);
  const allError = useAdminOrdersStore((s) => s.allError);
  const loadAll = useAdminOrdersStore((s) => s.loadAll);

  if (!loaded) return <AdminStatsSkeleton />;

  // Jamais de chiffres à zéro à la place d'une lecture échouée
  if (allError)
    return (
      <div role="alert" className="rounded-[var(--radius)] border border-sand p-4 font-sans text-sm text-cocoa">
        Les indicateurs n&apos;ont pas pu être calculés : {allError}{" "}
        <button type="button" onClick={() => void loadAll()} className="underline underline-offset-4">
          Réessayer
        </button>
      </div>
    );

  const monthStart = subDays(new Date(), 30).toISOString();
  const toProcess = orders.filter((o) => o.status === "en_attente").length;
  const inProgress = orders.filter((o) => o.status === "en_preparation" || o.status === "prete").length;
  const unpaid = orders.filter((o) => isOpenOrder(o.status) && !o.paid);
  const revenue = orders
    .filter((o) => o.status === "livree" && o.createdAt >= monthStart)
    .reduce((sum, o) => sum + orderTotal(o), 0);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile label="À traiter" value={String(toProcess)} hint="Nouvelles commandes" />
      <StatTile label="En cours" value={String(inProgress)} hint="En préparation ou en route" />
      <StatTile
        label="À encaisser"
        value={formatPrice(unpaid.reduce((sum, o) => sum + orderTotal(o), 0))}
        hint={`${unpaid.length} commande${unpaid.length > 1 ? "s" : ""} en cours`}
      />
      <StatTile label="Chiffre d'affaires" value={formatPrice(revenue)} hint="Commandes remises, 30 derniers jours" />
    </div>
  );
};

// Liste des commandes de la boutique : filtres, recherche, tri et pagination faits par l'API ; suivi
// (préparer, expédier, remettre, annuler)
export const OrdersManager = () => {
  const page = useAdminOrdersStore((s) => s.page);
  const pageError = useAdminOrdersStore((s) => s.pageError);
  const loading = useAdminOrdersStore((s) => s.query !== s.pageQuery);
  const loadPage = useAdminOrdersStore((s) => s.loadPage);
  const fetchMatching = useAdminOrdersStore((s) => s.fetchMatching);
  const [status, setStatus] = useState<OrderStatus | null>("en_attente");
  const [mode, setMode] = useState<DeliveryMode | "all">("all");
  const [payment, setPayment] = useState<PaymentFilter | "all">("all");
  const [sort, setSort] = useState<OrdersSort>("recentes");
  const [query, setQuery] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const search = useDeferredValue(query);

  const filters: OrdersQuery = {
    status,
    payment: payment === "all" ? null : payment,
    mode: mode === "all" ? null : mode,
    search,
    sort,
    page: pageNumber,
    pageSize: ADMIN_PAGE_SIZE,
  };
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    void loadPage(JSON.parse(filtersKey) as OrdersQuery);
  }, [filtersKey, loadPage]);

  if (!page && !pageError) return <AdminListSkeleton filters={4} columns={6} />;

  const count = (value: OrderStatus | null) =>
    !page ? 0 : value ? page.countByStatus[value] : Object.values(page.countByStatus).reduce((a, b) => a + b, 0);

  const pageCount = page ? Math.ceil(page.total / ADMIN_PAGE_SIZE) : 0;
  const currentPage = page?.page ?? pageNumber;
  const visible = page?.orders ?? [];

  const loadExport = async () => ({
    title: "Commandes",
    filename: "commandes",
    headers: exportHeaders,
    rows: (await fetchMatching(filters)).map(exportRow),
  });

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPageNumber(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Commandes"
        description="Acceptez les commandes de la boutique, préparez-les puis suivez leur remise."
      >
        <AdminExportButtons count={page?.total ?? 0} load={loadExport} />
      </AdminPageHeader>

      <OrderStats />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-taupe" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            placeholder="Nom, téléphone, e-mail ou référence"
            aria-label="Rechercher une commande"
            className={`${adminInputClassName} pl-10`}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:w-auto">
          <AdminSelect
            label="Filtrer par statut"
            value={status ?? "all"}
            onValueChange={(v) => resetPage(setStatus)(v === "all" ? null : (v as OrderStatus))}
            options={statusFilters.map((filter) => ({
              value: filter.value ?? "all",
              label: `${filter.label} (${count(filter.value)})`,
            }))}
            className="xl:w-48"
          />
          <AdminSelect label="Mode de remise" value={mode} onValueChange={resetPage(setMode)} options={modeFilters} className="xl:w-48" />
          <AdminSelect label="Paiement" value={payment} onValueChange={resetPage(setPayment)} options={paymentFilters} className="xl:w-44" />
          <AdminSelect label="Trier par" value={sort} onValueChange={resetPage(setSort)} options={sortOptions} className="xl:w-40" />
        </div>
      </div>

      {loading ? (
        <AdminTableSkeleton columns={6} />
      ) : pageError ? (
        <div role="alert" className="rounded-[var(--radius)] border border-sand p-6 font-sans text-sm text-cocoa">
          <p className="font-serif text-lg">Les commandes n&apos;ont pas pu être chargées.</p>
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
                  <TableHead className="px-4 text-taupe">Commande</TableHead>
                  <TableHead className="px-4 text-taupe">Client(e)</TableHead>
                  <TableHead className="px-4 text-taupe">Articles</TableHead>
                  <TableHead className="px-4 text-taupe">Remise</TableHead>
                  <TableHead className="px-4 text-taupe">Statut</TableHead>
                  <TableHead className="px-4 text-right text-taupe">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((o, index) => {
                  const items = orderItemCount(o);
                  const pickup = o.delivery.mode === "retrait";
                  return (
                    <TableRow key={o.id} className="border-sand hover:bg-transparent">
                      <TableCell className="px-4 py-3 text-right align-top text-taupe tabular-nums">
                        {(currentPage - 1) * ADMIN_PAGE_SIZE + index + 1}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <p>{o.reference}</p>
                        <p className="text-xs text-taupe">
                          {format(new Date(o.createdAt), "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <p>{customerName(o)}</p>
                        <p className="text-xs text-taupe">{o.customer.phone}</p>
                      </TableCell>
                      <TableCell className="max-w-64 px-4 py-3 align-top whitespace-normal">
                        <p className="line-clamp-2">{o.lines.map((l) => orderLineName(l)).join(", ")}</p>
                        <p className="text-xs text-taupe">
                          {items} article{items > 1 && "s"} · {formatPrice(orderTotal(o))} ·{" "}
                          <span className={o.paid || o.status === "annulee" ? undefined : "text-cocoa"}>
                            {o.paid ? "payée" : o.status === "annulee" ? "non payée" : "à encaisser"}
                          </span>
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <p>{pickup ? "Retrait au salon" : "Livraison"}</p>
                        {!pickup && <p className="text-xs text-taupe">{o.delivery.commune}</p>}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <OrderStatusBadge order={o} />
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <OrderActions order={o} />
                          <Link href={`/admin/commandes/${o.id}`} className={detailLinkClassName}>
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
          <AdminPager page={currentPage} pageCount={pageCount} onPageChange={setPageNumber} />
        </>
      ) : (
        <div className="flex flex-col items-center rounded-[var(--radius)] border border-sand py-16 text-center">
          <p className="font-serif text-lg text-cocoa">Aucune commande ne correspond à ces filtres.</p>
          <button
            type="button"
            onClick={() => {
              setStatus(null);
              setMode("all");
              setPayment("all");
              setQuery("");
              setPageNumber(1);
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

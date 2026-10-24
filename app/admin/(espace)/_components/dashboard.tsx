"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPanelTitle,
  StatusBadge,
  adminSmallButtonClassName,
  chipClassName,
} from "@/components/admin/admin-ui";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { buildStats, statsPeriods, type StatsPeriod } from "@/lib/admin-stats";
import { orderTotal } from "@/lib/commandes";
import { formatPrice } from "@/lib/prestations";
import {
  formatDay,
  formatSlotTime,
  reservationTotal,
  statusMeta,
  toDateKey,
  type ReservationStatus,
} from "@/lib/reservations";
import { useOrderStore, useOrdersHydrated } from "@/lib/stores/order-store";
import { useReservationStore, useReservationsHydrated } from "@/lib/stores/reservation-store";
import { useVisitStore, useVisitsHydrated } from "@/lib/stores/visit-store";

const visitorsConfig = {
  visitors: { label: "Visiteurs", color: "var(--color-cocoa)" },
} satisfies ChartConfig;

const reservationsConfig = {
  reservations: { label: "Réservations", color: "var(--color-cocoa)" },
} satisfies ChartConfig;

const ordersConfig = {
  orders: { label: "Commandes", color: "var(--color-taupe)" },
} satisfies ChartConfig;

const statusFilters: { value: ReservationStatus | null; label: string }[] = [
  { value: null, label: "Toutes" },
  ...(Object.keys(statusMeta) as ReservationStatus[]).map((value) => ({
    value,
    label: statusMeta[value].label,
  })),
];

const numberFormatter = new Intl.NumberFormat("fr-FR");

const StatTile = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
  <AdminPanel className="flex flex-col gap-1">
    <p className="font-sans text-sm text-taupe">{label}</p>
    <p className="font-serif text-3xl text-cocoa tabular-nums">{value}</p>
    <p className="font-sans text-xs text-taupe">{hint}</p>
  </AdminPanel>
);

// Infobulle : libellé complet de la période (« Semaine du 6 octobre »)
const tooltip = (
  <ChartTooltipContent
    indicator="line"
    labelFormatter={(_, payload) => <span className="first-letter:uppercase">{payload?.[0]?.payload?.title}</span>}
    className="bg-pearl font-sans"
  />
);

export const Dashboard = () => {
  const reservationsHydrated = useReservationsHydrated();
  const visitsHydrated = useVisitsHydrated();
  const ordersHydrated = useOrdersHydrated();
  const reservations = useReservationStore((s) => s.reservations);
  const visits = useVisitStore((s) => s.days);
  const orders = useOrderStore((s) => s.orders);
  const [period, setPeriod] = useState<StatsPeriod>("jour");
  const [status, setStatus] = useState<ReservationStatus | null>(null);

  const hydrated = reservationsHydrated && visitsHydrated && ordersHydrated;
  // Calculé dans le navigateur uniquement : dépend de la date du jour
  const stats = useMemo(
    () => (hydrated ? buildStats(period, status, reservations, visits, orders) : []),
    [hydrated, period, status, reservations, visits, orders],
  );

  if (!hydrated) return <div className="min-h-96" aria-hidden />;

  const periodMeta = statsPeriods.find((p) => p.value === period)!;
  const totalVisitors = stats.reduce((sum, p) => sum + p.visitors, 0);
  const totalReservations = stats.reduce((sum, p) => sum + p.reservations, 0);
  const totalOrders = stats.reduce((sum, p) => sum + p.orders, 0);
  const pending = reservations
    .filter((r) => r.status === "en_attente")
    .toSorted((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  // Nouvelles commandes, les plus anciennes d'abord
  const pendingOrders = orders
    .filter((o) => o.status === "en_attente")
    .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Chiffre d'affaires estimé : soins terminés sur la période affichée
  const today = toDateKey(new Date());
  const revenue = reservations
    .filter((r) => r.status === "terminee" && r.date >= stats[0].key && r.date <= today)
    .reduce((sum, r) => sum + reservationTotal(r), 0);

  const todayAppointments = reservations
    .filter((r) => r.date === today && r.status === "confirmee")
    .toSorted((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Tableau de bord" description={`Activité du salon · ${periodMeta.description}`}>
        <div role="group" aria-label="Période" className="flex gap-2">
          {statsPeriods.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              aria-pressed={period === p.value}
              className={chipClassName(period === p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </AdminPageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Visiteurs" value={numberFormatter.format(totalVisitors)} hint={periodMeta.description} />
        <StatTile
          label={status ? `Réservations « ${statusMeta[status].label} »` : "Réservations reçues"}
          value={numberFormatter.format(totalReservations)}
          hint={periodMeta.description}
        />
        <StatTile label="Réservations à traiter" value={String(pending.length)} hint="en attente de confirmation" />
        <StatTile
          label="Commandes à traiter"
          value={String(pendingOrders.length)}
          hint="nouvelles commandes à accepter"
        />
        <StatTile label="Chiffre d'affaires estimé" value={formatPrice(revenue)} hint="soins terminés sur la période" />
      </div>

      <AdminPanel>
        <AdminPanelTitle>Visiteurs</AdminPanelTitle>
        <p className="mt-1 font-sans text-sm text-taupe">Visiteurs du site par {periodMeta.label.toLowerCase()}</p>
        <ChartContainer config={visitorsConfig} className="mt-6 aspect-auto h-64 w-full">
          <AreaChart data={stats} margin={{ left: 0, right: 8, top: 8 }}>
            {/* Dégradé rose poudré → blanc perlé : remplissage plus léger, sans opacité */}
            <defs>
              <linearGradient id="visitors-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-blush)" />
                <stop offset="100%" stopColor="var(--color-pearl)" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
            <ChartTooltip cursor={false} content={tooltip} />
            <Area
              dataKey="visitors"
              type="monotone"
              stroke="var(--color-visitors)"
              strokeWidth={2}
              fill="url(#visitors-fill)"
              fillOpacity={1}
            />
          </AreaChart>
        </ChartContainer>
      </AdminPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel>
          <AdminPanelTitle>Réservations</AdminPanelTitle>
          <p className="mt-1 font-sans text-sm text-taupe">
            Demandes reçues par {periodMeta.label.toLowerCase()}, selon leur statut
          </p>
          <div role="group" aria-label="Filtrer par statut" className="mt-4 flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value ?? "all"}
                type="button"
                onClick={() => setStatus(filter.value)}
                aria-pressed={status === filter.value}
                className={chipClassName(status === filter.value) + " px-3 py-1 text-xs"}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <ChartContainer config={reservationsConfig} className="mt-6 aspect-auto h-52 w-full">
            <BarChart data={stats} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
              <ChartTooltip cursor={false} content={tooltip} />
              <Bar dataKey="reservations" fill="var(--color-reservations)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ChartContainer>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelTitle>Commandes</AdminPanelTitle>
          <p className="mt-1 font-sans text-sm text-taupe">
            Commandes de la boutique reçues par {periodMeta.label.toLowerCase()}, hors annulées ·{" "}
            <span className="text-cocoa">
              {numberFormatter.format(totalOrders)} commande{totalOrders > 1 && "s"}
            </span>
          </p>
          <ChartContainer config={ordersConfig} className="mt-6 aspect-auto h-64 w-full">
            <BarChart data={stats} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
              <ChartTooltip cursor={false} content={tooltip} />
              <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ChartContainer>
        </AdminPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <AdminPanel>
          <div className="flex items-center justify-between gap-4">
            <AdminPanelTitle>Réservations à traiter</AdminPanelTitle>
            <Link
              href="/admin/reservations"
              className="inline-flex items-center gap-1 font-sans text-sm text-cocoa underline-offset-4 hover:underline"
            >
              Tout voir <ArrowRight className="size-4" strokeWidth={1.75} />
            </Link>
          </div>
          {pending.length > 0 ? (
            <ul className="mt-4 divide-y divide-sand font-sans text-sm">
              {pending.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-cocoa">
                      {r.client.firstName} {r.client.lastName}
                    </p>
                    <p className="text-taupe first-letter:uppercase">
                      {formatDay(r.date)} · {formatSlotTime(r.start, r.end)}
                    </p>
                  </div>
                  <Link href={`/admin/reservations/${r.id}`} className={adminSmallButtonClassName}>
                    Traiter
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 font-sans text-sm text-taupe">Aucune réservation en attente.</p>
          )}
        </AdminPanel>

        <AdminPanel>
          <div className="flex items-center justify-between gap-4">
            <AdminPanelTitle>Commandes à traiter</AdminPanelTitle>
            <Link
              href="/admin/commandes"
              className="inline-flex items-center gap-1 font-sans text-sm text-cocoa underline-offset-4 hover:underline"
            >
              Tout voir <ArrowRight className="size-4" strokeWidth={1.75} />
            </Link>
          </div>
          {pendingOrders.length > 0 ? (
            <ul className="mt-4 divide-y divide-sand font-sans text-sm">
              {pendingOrders.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-cocoa">
                      {o.customer.firstName} {o.customer.lastName}
                    </p>
                    <p className="text-taupe">
                      {o.reference} · {formatPrice(orderTotal(o))} ·{" "}
                      {format(new Date(o.createdAt), "d MMM 'à' HH'h'mm", {
                        locale: fr,
                      })}
                    </p>
                  </div>
                  <Link href={`/admin/commandes/${o.id}`} className={adminSmallButtonClassName}>
                    Traiter
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 font-sans text-sm text-taupe">Aucune commande en attente.</p>
          )}
        </AdminPanel>

        <AdminPanel>
          <AdminPanelTitle>Rendez-vous du jour</AdminPanelTitle>
          {todayAppointments.length > 0 ? (
            <ul className="mt-4 divide-y divide-sand font-sans text-sm">
              {todayAppointments.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-cocoa">
                      {formatSlotTime(r.start, r.end)} · {r.client.firstName} {r.client.lastName}
                    </p>
                    <p className="text-taupe">{r.lines.map((line) => line.name).join(", ")}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 font-sans text-sm text-taupe">Aucun rendez-vous confirmé aujourd&apos;hui.</p>
          )}
        </AdminPanel>
      </div>
    </div>
  );
};

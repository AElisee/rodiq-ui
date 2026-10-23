import {
  addDays,
  addMonths,
  addWeeks,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { Prestation } from "@/lib/prestations";
import type { Reservation, ReservationStatus } from "@/lib/reservations";

export type StatsPeriod = "jour" | "semaine" | "mois";

export const statsPeriods: { value: StatsPeriod; label: string; description: string }[] = [
  { value: "jour", label: "Jour", description: "30 derniers jours" },
  { value: "semaine", label: "Semaine", description: "12 dernières semaines" },
  { value: "mois", label: "Mois", description: "12 derniers mois" },
];

export type StatsPoint = {
  key: string;
  label: string;
  // Libellé complet affiché dans l'infobulle
  title: string;
  visitors: number;
  reservations: number;
};

// Tranches de temps se terminant aujourd'hui, de la plus ancienne à la plus récente
const buckets = (period: StatsPeriod, now: Date) => {
  const today = startOfDay(now);
  if (period === "jour") {
    return Array.from({ length: 30 }, (_, i) => {
      const start = addDays(today, i - 29);
      return {
        start,
        end: addDays(start, 1),
        label: format(start, "d MMM", { locale: fr }),
        title: format(start, "EEEE d MMMM", { locale: fr }),
      };
    });
  }
  if (period === "semaine") {
    const current = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 12 }, (_, i) => {
      const start = addWeeks(current, i - 11);
      return {
        start,
        end: addWeeks(start, 1),
        label: format(start, "d MMM", { locale: fr }),
        title: `Semaine du ${format(start, "d MMMM", { locale: fr })}`,
      };
    });
  }
  const current = startOfMonth(today);
  return Array.from({ length: 12 }, (_, i) => {
    const start = addMonths(current, i - 11);
    return {
      start,
      end: addMonths(start, 1),
      label: format(start, "MMM", { locale: fr }),
      title: format(start, "MMMM yyyy", { locale: fr }),
    };
  });
};

// Visiteurs et réservations reçues (date de la demande) par jour, semaine ou mois
export const buildStats = (
  period: StatsPeriod,
  status: ReservationStatus | null,
  reservations: Reservation[],
  visits: Record<string, number>,
  now = new Date(),
): StatsPoint[] => {
  const visitDays = Object.entries(visits).map(([day, count]) => ({ time: parseISO(day).getTime(), count }));
  const requests = reservations
    .filter((r) => !status || r.status === status)
    .map((r) => new Date(r.createdAt).getTime());

  return buckets(period, now).map(({ start, end, label, title }) => {
    const from = start.getTime();
    const to = end.getTime();
    return {
      key: format(start, "yyyy-MM-dd"),
      label,
      title,
      visitors: visitDays.reduce((sum, v) => (v.time >= from && v.time < to ? sum + v.count : sum), 0),
      reservations: requests.filter((t) => t >= from && t < to).length,
    };
  });
};

// Montant estimé d'une réservation (prix d'appel pour les tarifs « dès »)
export const reservationTotal = (reservation: Reservation, prestations: Prestation[]) =>
  prestations
    .filter((p) => reservation.prestationIds.includes(p.id))
    .reduce((sum, p) => sum + p.price, 0);

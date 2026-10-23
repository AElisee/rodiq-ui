import { addDays, differenceInCalendarDays, format, isAfter, parse, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

// Cycle de vie d'une réservation :
// en_attente → confirmee → terminee
//            ↘ refusee (motif obligatoire, côté admin)
// en_attente / confirmee → annulee (par la cliente, dans le délai autorisé)
export type ReservationStatus = "en_attente" | "confirmee" | "refusee" | "annulee" | "terminee";

export type ContactChannel = "appel" | "whatsapp" | "sms" | "email";

export type ReservationClient = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  contactChannel: ContactChannel;
};

export type Reservation = {
  id: string;
  // Référence courte communiquée à la cliente (téléphone, SMS…)
  reference: string;
  prestationIds: string[];
  slotId: string;
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string; // HH:mm
  client: ReservationClient;
  note?: string;
  status: ReservationStatus;
  rejectionReason?: string;
  cancellationReason?: string;
  // La cliente a créé son compte en même temps que cette réservation
  accountRequested: boolean;
  // Compte de la cliente, si elle était connectée ou l'a créé en réservant
  accountId?: string;
  createdAt: string; // ISO
};

export type Slot = {
  id: string;
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string; // HH:mm
  capacity: number;
};

// Règles de réservation réglées par l'admin (voir lib/stores/settings-store.ts)
export type BookingRules = {
  // Annulation possible jusqu'à N jours avant le jour du rendez-vous
  cancellationNoticeDays: number;
  // Réservation ouverte sur les N prochains jours
  bookingWindowDays: number;
  // Délai minimum entre la réservation et le début du créneau
  minNoticeHours: number;
};

export type DayHours = {
  open: boolean;
  opening: string; // HH:mm
  closing: string; // HH:mm
  // Pause déjeuner facultative : aucun créneau ne la chevauche
  breakStart?: string;
  breakEnd?: string;
};

export type ClosedDate = { date: string; label: string }; // yyyy-MM-dd

export type Schedule = {
  rules: BookingRules;
  // Index 0 = dimanche … 6 = samedi (comme Date.getDay())
  week: DayHours[];
  slotMinutes: number;
  slotCapacity: number;
  closedDates: ClosedDate[];
};

export const weekdayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export const statusMeta: Record<
  ReservationStatus,
  { label: string; description: string; badgeClassName: string }
> = {
  en_attente: {
    label: "En attente",
    description: "Nous vérifions la disponibilité et revenons vers vous rapidement.",
    badgeClassName: "bg-sand text-cocoa",
  },
  confirmee: {
    label: "Confirmée",
    description: "Votre rendez-vous est confirmé, nous avons hâte de vous recevoir.",
    badgeClassName: "bg-blush text-cocoa",
  },
  refusee: {
    label: "Refusée",
    description: "Votre demande n'a pas pu être acceptée.",
    badgeClassName: "bg-gold text-cocoa",
  },
  annulee: {
    label: "Annulée",
    description: "Vous avez annulé cette réservation.",
    badgeClassName: "border border-gold text-cocoa",
  },
  terminee: {
    label: "Soin terminé",
    description: "Merci pour votre visite.",
    badgeClassName: "bg-cocoa text-pearl",
  },
};

export const contactChannels: { value: ContactChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "appel", label: "Appel" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "E-mail" },
];

// Une réservation active occupe une place sur son créneau
export const isActive = (status: ReservationStatus) =>
  status === "en_attente" || status === "confirmee";

const slotDate = (date: string) => parse(date, "yyyy-MM-dd", new Date());

export const slotStart = (date: string, start: string) =>
  parse(`${date} ${start}`, "yyyy-MM-dd HH:mm", new Date());

// Dernier jour (inclus) où la cliente peut annuler elle-même
export const cancellationDeadline = (reservation: Pick<Reservation, "date">, noticeDays: number) =>
  addDays(slotDate(reservation.date), -noticeDays);

export const canCancel = (reservation: Reservation, noticeDays: number, now = new Date()) =>
  isActive(reservation.status) &&
  differenceInCalendarDays(slotDate(reservation.date), now) >= noticeDays;

export const formatDay = (date: string | Date) =>
  format(typeof date === "string" ? slotDate(date) : date, "EEEE d MMMM yyyy", { locale: fr });

export const formatSlotTime = (start: string, end: string) =>
  `${start.replace(":", "h")} – ${end.replace(":", "h")}`;

export const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");

// Référence lisible, sans caractères ambigus (0/O, 1/I)
export const generateReference = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (n) => alphabet[n % alphabet.length]);
  return `RDQ-${code.join("")}`;
};

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Créneaux d'une journée : de l'ouverture à la fermeture, par pas de slotMinutes, hors pause
export const daySlotTimes = (hours: DayHours, slotMinutes: number) => {
  if (!hours.open || slotMinutes <= 0) return [];
  const closing = toMinutes(hours.closing);
  const pause =
    hours.breakStart && hours.breakEnd
      ? { start: toMinutes(hours.breakStart), end: toMinutes(hours.breakEnd) }
      : null;
  const times: { start: string; end: string }[] = [];
  let start = toMinutes(hours.opening);

  while (start + slotMinutes <= closing) {
    // Le créneau chevaucherait la pause : on reprend à la fin de celle-ci
    if (pause && start < pause.end && start + slotMinutes > pause.start) {
      start = Math.max(start, pause.end);
      continue;
    }
    times.push({ start: toTime(start), end: toTime(start + slotMinutes) });
    start += slotMinutes;
  }
  return times;
};

// Créneaux réservables sur la fenêtre de réservation (hors jours fermés et délai minimum)
export const getSlots = (schedule: Schedule, now = new Date()): Slot[] => {
  const { rules, week, slotMinutes, slotCapacity, closedDates } = schedule;
  const earliest = new Date(now.getTime() + rules.minNoticeHours * 3_600_000);
  const today = startOfDay(now);
  const closed = new Set(closedDates.map((d) => d.date));

  return Array.from({ length: rules.bookingWindowDays + 1 }, (_, i) => addDays(today, i))
    .filter((day) => !closed.has(toDateKey(day)))
    .flatMap((day) =>
      daySlotTimes(week[day.getDay()], slotMinutes).map(({ start, end }) => {
        const date = toDateKey(day);
        return { id: `${date}_${start}`, date, start, end, capacity: slotCapacity };
      }),
    )
    .filter((slot) => isAfter(slotStart(slot.date, slot.start), earliest));
};

const formatHour = (time: string) => time.replace(":00", "h").replace(":", "h");

// Horaires groupés par jours consécutifs identiques, du lundi au dimanche (pied de page)
export const groupOpeningHours = (week: DayHours[]) => {
  const label = (d: DayHours) =>
    d.open ? `${formatHour(d.opening)} – ${formatHour(d.closing)}` : "Fermé";
  const groups: { first: number; last: number; time: string }[] = [];

  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    const time = label(week[day]);
    const previous = groups.at(-1);
    if (previous?.time === time) previous.last = day;
    else groups.push({ first: day, last: day, time });
  }

  return groups.map(({ first, last, time }) => ({
    days: first === last ? weekdayNames[first] : `${weekdayNames[first]} – ${weekdayNames[last]}`,
    time,
  }));
};

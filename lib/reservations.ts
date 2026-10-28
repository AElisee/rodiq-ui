import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";

// Cycle de vie d'une réservation (appliqué par l'API, `api-rodiq/src/reservations/reservations.rules.ts`) :
// en_attente → confirmee → terminee
// en_attente / confirmee (à venir) → refusee (motif obligatoire, côté admin)
// en_attente / confirmee → annulee (par la cliente, dans le délai autorisé)
export type ReservationStatus = "en_attente" | "confirmee" | "refusee" | "annulee" | "terminee";

export type ContactChannel = "appel" | "whatsapp" | "sms" | "email";

// Coordonnées copiées du compte de la cliente à la réservation
export type ReservationClient = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp?: string;
  email: string;
  contactChannel: ContactChannel;
};

// Prestation figée au moment de la demande (le catalogue peut changer ensuite)
export type ReservationLine = {
  prestationId: string;
  name: string;
  price: number; // FCFA
  fromPrice?: boolean;
};

export type Reservation = {
  id: string;
  // Référence courte communiquée à la cliente (téléphone, SMS…), générée par l'API
  reference: string;
  lines: ReservationLine[];
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string; // HH:mm
  client: ReservationClient;
  note?: string;
  status: ReservationStatus;
  rejectionReason?: string;
  cancellationReason?: string;
  createdAt: string; // ISO
  // Dernier changement de statut (ISO)
  processedAt?: string;
  // Vue de la cliente : annulation en ligne encore possible, et instant (exclu) jusqu'auquel le faire
  canCancel?: boolean;
  cancellationDeadline?: string; // ISO
  // Vue de l'admin : compte de la cliente
  accountId?: string;
};

// Créneau réservable, avec ses places libres (calculé par l'API)
export type Slot = {
  id: string; // `${date}_${start}`
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string; // HH:mm
  remaining: number | null; // null = places illimitées, 0 = complet
};

// Règles de réservation réglées par l'admin (voir lib/stores/settings-store.ts)
export type BookingRules = {
  // Annulation possible jusqu'à N heures avant le début du rendez-vous, null = jusqu'au début
  cancellationNoticeHours: number | null;
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
  // null = places illimitées
  slotCapacity: number | null;
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
    // Refus d'une demande, ou rendez-vous confirmé puis annulé par le salon
    description: "Le salon n'a pas pu accepter ou maintenir ce rendez-vous.",
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

// Montant estimé d'une réservation (prix d'appel pour les tarifs « dès »)
export const reservationTotal = (reservation: Pick<Reservation, "lines">) =>
  reservation.lines.reduce((sum, line) => sum + line.price, 0);

export const hasFromPrice = (reservation: Pick<Reservation, "lines">) =>
  reservation.lines.some((line) => line.fromPrice);

// Une réservation active occupe une place sur son créneau
export const isActive = (status: ReservationStatus) =>
  status === "en_attente" || status === "confirmee";

const slotDate = (date: string) => parse(date, "yyyy-MM-dd", new Date());

export const formatDay = (date: string | Date) =>
  format(typeof date === "string" ? slotDate(date) : date, "EEEE d MMMM yyyy", { locale: fr });

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

// « 2 jours », « 1 jour et 6 heures », « 12 heures » (délai d'annulation)
export const formatNotice = (hours: number) => {
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return [days && plural(days, "jour"), rest && plural(rest, "heure")].filter(Boolean).join(" et ");
};

const deadlineFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Abidjan",
});

// « 3 novembre à 14h00 », à l'heure du salon (limite d'annulation)
export const formatDeadline = (iso: string) => {
  const part = Object.fromEntries(deadlineFormat.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${part.day} ${part.month} à ${part.hour}h${part.minute}`;
};

export const formatSlotTime = (start: string, end: string) =>
  `${start.replace(":", "h")} – ${end.replace(":", "h")}`;

export const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Créneaux d'une journée : de l'ouverture à la fermeture, par pas de slotMinutes, hors pause
// (aperçu de l'écran Réglages ; les créneaux réservables viennent de l'API, `GET /creneaux`)
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

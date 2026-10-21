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
  // Places déjà prises par d'autres clientes (fourni par l'API)
  booked: number;
};

// Réglages définis par l'admin (maquette : valeurs fixes en attendant l'API)
export const bookingSettings = {
  // Annulation possible jusqu'à N jours avant le jour du rendez-vous
  cancellationNoticeDays: 2,
  // Réservation ouverte sur les N prochains jours
  bookingWindowDays: 30,
  // Délai minimum entre la réservation et le début du créneau
  minNoticeHours: 12,
};

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
export const cancellationDeadline = (reservation: Pick<Reservation, "date">) =>
  addDays(slotDate(reservation.date), -bookingSettings.cancellationNoticeDays);

export const canCancel = (reservation: Reservation, now = new Date()) =>
  isActive(reservation.status) &&
  differenceInCalendarDays(slotDate(reservation.date), now) >=
    bookingSettings.cancellationNoticeDays;

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

// ---------------------------------------------------------------------------
// Maquette : créneaux paramétrés par l'admin, générés en attendant l'API.
// Ouvert du mardi au samedi, 4 créneaux par jour, 2 places par créneau.
// ---------------------------------------------------------------------------
const openDays = [2, 3, 4, 5, 6];
const dailySlots = [
  { start: "09:00", end: "11:00" },
  { start: "11:00", end: "13:00" },
  { start: "14:00", end: "16:00" },
  { start: "16:00", end: "18:00" },
];
const SLOT_CAPACITY = 2;

// Pseudo-aléatoire stable pour simuler les places prises par d'autres clientes
const mockBooked = (id: string) =>
  [...id].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 997, 7) % (SLOT_CAPACITY + 1);

export const getSlots = (now = new Date()): Slot[] => {
  const earliest = new Date(now.getTime() + bookingSettings.minNoticeHours * 3_600_000);
  const today = startOfDay(now);

  return Array.from({ length: bookingSettings.bookingWindowDays + 1 }, (_, i) => addDays(today, i))
    .filter((day) => openDays.includes(day.getDay()))
    .flatMap((day) =>
      dailySlots.map(({ start, end }) => {
        const date = toDateKey(day);
        const id = `${date}_${start}`;
        return { id, date, start, end, capacity: SLOT_CAPACITY, booked: mockBooked(id) };
      }),
    )
    .filter((slot) => isAfter(slotStart(slot.date, slot.start), earliest));
};

import type { ShippingRate } from "@/lib/commandes";
import type { BookingRules, ClosedDate, DayHours } from "@/lib/reservations";
import type {
  GeoPoint,
  LogoVariant,
  PlatformInfo,
  SalonInfo,
  Settings,
  ShippingSettings,
} from "@/lib/stores/settings-store";
import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

// Réglages du salon. L'API parle français (`regles`, `semaine`…), le front garde ses noms : la traduction
// dans les deux sens est faite ici seulement. Chaque écriture renvoie tous les réglages.

type RulesDto = { fenetreReservationJours: number; delaiMinimumHeures: number; delaiAnnulationHeures: number | null };
type DayDto = { ouvert: boolean; ouverture: string; fermeture: string; debutPause?: string; finPause?: string };
type RateDto = { destination: string; frais: number };
type ShippingDto = { domicile: RateDto[]; expedition: RateDto[] };
type PositionDto = { latitude: number; longitude: number };
type PlatformInfoDto = {
  nom: string;
  slogan: string;
  email: string;
  telephone: string;
  telephoneSecondaire: string;
  whatsapp: string;
  reseauxSociaux: { instagram: string; facebook: string; tiktok: string };
};

type SettingsDto = {
  regles: RulesDto;
  semaine: DayDto[];
  dureeCreneauMinutes: number;
  placesParCreneau: number | null;
  fermetures: { date: string; motif: string }[];
  plateforme: PlatformInfoDto & { logos: Partial<Record<LogoVariant, string>> };
  salon: { adresse: string };
  position: PositionDto;
  livraisons: ShippingDto;
};

// --- Front → API ---

const rulesToDto = (r: BookingRules): RulesDto => ({
  fenetreReservationJours: r.bookingWindowDays,
  delaiMinimumHeures: r.minNoticeHours,
  delaiAnnulationHeures: r.cancellationNoticeHours,
});

const dayToDto = (d: DayHours): DayDto => ({
  ouvert: d.open,
  ouverture: d.opening,
  fermeture: d.closing,
  debutPause: d.breakStart,
  finPause: d.breakEnd,
});

const ratesToDto = (rates: ShippingRate[]): RateDto[] => rates.map((r) => ({ destination: r.place, frais: r.fee }));

const shippingToDto = (s: ShippingSettings): ShippingDto => ({
  domicile: ratesToDto(s.delivery),
  expedition: ratesToDto(s.expedition),
});

const positionToDto = (p: GeoPoint): PositionDto => ({ latitude: p.lat, longitude: p.lng });

const platformToDto = (p: Omit<PlatformInfo, "logos">): PlatformInfoDto => ({
  nom: p.name,
  slogan: p.tagline,
  email: p.email,
  telephone: p.phone,
  telephoneSecondaire: p.phoneSecondary,
  whatsapp: p.whatsapp,
  reseauxSociaux: p.socials,
});

const hoursToDto = (week: DayHours[], slotMinutes: number, slotCapacity: number | null) => ({
  semaine: week.map(dayToDto),
  dureeCreneauMinutes: slotMinutes,
  placesParCreneau: slotCapacity,
});

// --- API → front ---

const ratesFromDto = (rates: RateDto[]): ShippingRate[] => rates.map((r) => ({ place: r.destination, fee: r.frais }));

const fromDto = (dto: SettingsDto): Settings => ({
  rules: {
    bookingWindowDays: dto.regles.fenetreReservationJours,
    minNoticeHours: dto.regles.delaiMinimumHeures,
    cancellationNoticeHours: dto.regles.delaiAnnulationHeures,
  },
  week: dto.semaine.map((d) => ({
    open: d.ouvert,
    opening: d.ouverture,
    closing: d.fermeture,
    breakStart: d.debutPause ?? undefined,
    breakEnd: d.finPause ?? undefined,
  })),
  slotMinutes: dto.dureeCreneauMinutes,
  slotCapacity: dto.placesParCreneau,
  closedDates: dto.fermetures.map((f): ClosedDate => ({ date: f.date, label: f.motif })),
  platform: {
    name: dto.plateforme.nom,
    tagline: dto.plateforme.slogan,
    email: dto.plateforme.email,
    phone: dto.plateforme.telephone,
    phoneSecondary: dto.plateforme.telephoneSecondaire,
    whatsapp: dto.plateforme.whatsapp,
    socials: dto.plateforme.reseauxSociaux,
    logos: dto.plateforme.logos ?? {},
  },
  salon: { address: dto.salon.adresse },
  location: { lat: dto.position.latitude, lng: dto.position.longitude },
  shipping: { delivery: ratesFromDto(dto.livraisons.domicile), expedition: ratesFromDto(dto.livraisons.expedition) },
});

const write = async (path: string, method: "POST" | "PUT" | "DELETE", body?: unknown) =>
  fromDto(await apiRequest<SettingsDto>(path, { method, body }));

const p = endpoints.parametres;

export const parametresApi = {
  // Public ; 404 tant que le salon n'est pas configuré
  get: async () => fromDto(await apiRequest<SettingsDto>(p.lecture)),

  // Première configuration (409 si déjà faite) : sans logos ni fermetures
  create: (s: Settings) =>
    write(p.creation, "POST", {
      ...hoursToDto(s.week, s.slotMinutes, s.slotCapacity),
      regles: rulesToDto(s.rules),
      plateforme: platformToDto(s.platform),
      salon: { adresse: s.salon.address },
      position: positionToDto(s.location),
      livraisons: shippingToDto(s.shipping),
    }),

  setPlatform: (platform: Omit<PlatformInfo, "logos">) => write(p.plateforme, "PUT", platformToDto(platform)),
  setLogo: (variant: LogoVariant, dataUrl: string) => write(p.logo(variant), "PUT", { image: dataUrl }),
  removeLogo: (variant: LogoVariant) => write(p.logo(variant), "DELETE"),
  setHours: (week: DayHours[], slotMinutes: number, slotCapacity: number | null) =>
    write(p.horaires, "PUT", hoursToDto(week, slotMinutes, slotCapacity)),
  setRules: (rules: BookingRules) => write(p.regles, "PUT", rulesToDto(rules)),
  addClosedDate: ({ date, label }: ClosedDate) => write(p.fermetures, "POST", { date, motif: label }),
  removeClosedDate: (date: string) => write(p.fermeture(date), "DELETE"),
  setSalon: (salon: SalonInfo, location: GeoPoint) =>
    write(p.salon, "PUT", { adresse: salon.address, position: positionToDto(location) }),
  setShipping: (shipping: ShippingSettings) => write(p.livraisons, "PUT", shippingToDto(shipping)),
};

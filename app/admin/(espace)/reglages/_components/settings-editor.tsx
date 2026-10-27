"use client";

import { Crosshair, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPanelTitle,
  adminButtonClassName,
  adminInputClassName,
  adminLabelClassName,
  adminOutlineButtonClassName,
} from "@/components/admin/admin-ui";
import { AdminDatePicker } from "@/components/admin/admin-date-picker";
import { FieldError } from "@/components/forms/form-fields";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  daySlotTimes,
  formatDay,
  toDateKey,
  weekdayNames,
  type BookingRules,
  type DayHours,
} from "@/lib/reservations";
import { useSettingsHydrated, useSettingsStore, type GeoPoint } from "@/lib/stores/settings-store";
import { PlatformSettings } from "./platform-settings";
import { ShippingSettingsForm } from "./shipping-settings";
import { useSave } from "./use-save";

// Leaflet a besoin du navigateur : la carte n'est jamais rendue côté serveur
const LocationMap = dynamic(() => import("@/components/map/location-map").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => <div className="h-80 w-full rounded-[var(--radius)] border border-sand bg-sand" aria-hidden />,
});

// Lundi en premier, comme dans le pied de page
const weekOrder = [1, 2, 3, 4, 5, 6, 0];
const slotDurations = [30, 45, 60, 90, 120, 150, 180];

const timeInputClassName = `${adminInputClassName} w-28 px-3`;

const formatDuration = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ""}`;

const dayError = (day: DayHours) => {
  if (!day.open) return undefined;
  if (day.closing <= day.opening) return "La fermeture doit être après l'ouverture";
  if (day.breakStart || day.breakEnd) {
    if (!day.breakStart || !day.breakEnd) return "Indiquez le début et la fin de la pause";
    if (day.breakEnd <= day.breakStart) return "La fin de la pause doit être après son début";
    if (day.breakStart < day.opening || day.breakEnd > day.closing) return "La pause doit être pendant les heures d'ouverture";
  }
  return undefined;
};

// Heures d'ouverture, pause et format des créneaux réservables
const OpeningHours = () => {
  const week = useSettingsStore((s) => s.week);
  const slotMinutes = useSettingsStore((s) => s.slotMinutes);
  const slotCapacity = useSettingsStore((s) => s.slotCapacity);
  const setHours = useSettingsStore((s) => s.setHours);
  const { saving, run } = useSave();
  const [draft, setDraft] = useState(week);
  const [minutes, setMinutes] = useState(slotMinutes);
  const [capacity, setCapacity] = useState(String(slotCapacity ?? 2));
  const [unlimited, setUnlimited] = useState(slotCapacity === null);

  const capacityValue = unlimited ? null : Number(capacity);
  const capacityError =
    capacityValue !== null && (!Number.isInteger(capacityValue) || capacityValue < 1 || capacityValue > 20)
      ? "Entre 1 et 20 places"
      : undefined;
  const errors = draft.map(dayError);
  const invalid = errors.some(Boolean) || !!capacityError;
  const changed =
    JSON.stringify(draft) !== JSON.stringify(week) || minutes !== slotMinutes || capacityValue !== slotCapacity;

  const update = (index: number, changes: Partial<DayHours>) =>
    setDraft((d) => d.map((day, i) => (i === index ? { ...day, ...changes } : day)));

  const save = () =>
    run(
      () => setHours(draft, minutes, capacityValue),
      () => toast.success("Horaires enregistrés", { description: "Les créneaux du site sont mis à jour." }),
    );

  return (
    <AdminPanel className="flex flex-col gap-6">
      <div>
        <AdminPanelTitle>Horaires et créneaux</AdminPanelTitle>
        <p className="mt-1 font-sans text-sm text-taupe">
          Heures d&apos;ouverture affichées dans le pied de page et créneaux proposés à la réservation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        <div>
          <label htmlFor="slot-duration" className={adminLabelClassName}>
            Durée d&apos;un créneau
          </label>
          <select
            id="slot-duration"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className={adminInputClassName}
          >
            {slotDurations.map((d) => (
              <option key={d} value={d}>
                {formatDuration(d)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="slot-capacity" className={adminLabelClassName}>
            Places par créneau
          </label>
          <div className="flex items-center gap-4">
            <input
              id="slot-capacity"
              type="number"
              min={1}
              max={20}
              value={unlimited ? "" : capacity}
              onChange={(e) => setCapacity(e.target.value)}
              disabled={unlimited}
              placeholder={unlimited ? "Illimitées" : undefined}
              aria-invalid={!!capacityError}
              className={`${adminInputClassName} w-28!`}
            />
            <label className="flex cursor-pointer items-center gap-2 font-sans text-sm text-cocoa">
              <input
                type="checkbox"
                checked={unlimited}
                onChange={(e) => setUnlimited(e.target.checked)}
                className="size-4 accent-cocoa"
              />
              Illimitées
            </label>
          </div>
          <FieldError message={capacityError} />
        </div>
      </div>

      <ul className="divide-y divide-sand border-y border-sand font-sans text-sm text-cocoa">
        {weekOrder.map((index) => {
          const day = draft[index];
          const noSlot = !errors[index] && day.open && daySlotTimes(day, minutes).length === 0;
          return (
            <li key={index} className="flex flex-col gap-3 py-4 xl:flex-row xl:items-start xl:gap-6">
              <label className="flex w-36 shrink-0 cursor-pointer items-center gap-3 pt-2.5">
                <input
                  type="checkbox"
                  checked={day.open}
                  onChange={(e) => update(index, { open: e.target.checked })}
                  className="size-4 accent-cocoa"
                />
                <span className="font-serif text-base">{weekdayNames[index]}</span>
              </label>

              {day.open ? (
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={day.opening}
                        onChange={(e) => update(index, { opening: e.target.value })}
                        aria-label={`${weekdayNames[index]} : ouverture`}
                        className={timeInputClassName}
                      />
                      <span className="text-taupe">à</span>
                      <input
                        type="time"
                        value={day.closing}
                        onChange={(e) => update(index, { closing: e.target.value })}
                        aria-label={`${weekdayNames[index]} : fermeture`}
                        className={timeInputClassName}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-taupe">Pause</span>
                      <input
                        type="time"
                        value={day.breakStart ?? ""}
                        onChange={(e) => update(index, { breakStart: e.target.value || undefined })}
                        aria-label={`${weekdayNames[index]} : début de la pause`}
                        className={timeInputClassName}
                      />
                      <span className="text-taupe">à</span>
                      <input
                        type="time"
                        value={day.breakEnd ?? ""}
                        onChange={(e) => update(index, { breakEnd: e.target.value || undefined })}
                        aria-label={`${weekdayNames[index]} : fin de la pause`}
                        className={timeInputClassName}
                      />
                      {(day.breakStart || day.breakEnd) && (
                        <button
                          type="button"
                          onClick={() => update(index, { breakStart: undefined, breakEnd: undefined })}
                          className="group inline-flex cursor-pointer items-center gap-1 text-xs whitespace-nowrap text-cocoa underline underline-offset-4 transition-[text-underline-offset] duration-300 hover:underline-offset-2"
                        >
                          <X className="size-3.5 transition-transform duration-300 ease-out group-hover:rotate-90" strokeWidth={1.75} aria-hidden />
                          sans pause
                        </button>
                      )}
                    </div>
                  </div>
                  {errors[index] ? (
                    <FieldError message={errors[index]} />
                  ) : (
                    noSlot && <p className="text-xs text-taupe">Aucun créneau : la durée dépasse les heures d&apos;ouverture.</p>
                  )}
                </div>
              ) : (
                <p className="pt-2.5 text-taupe">Fermé</p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-end gap-4">
        {changed && <p className="font-sans text-sm text-taupe">Modifications non enregistrées</p>}
        <button type="button" onClick={save} disabled={!changed || invalid || saving} className={adminButtonClassName}>
          Enregistrer les horaires
        </button>
      </div>
    </AdminPanel>
  );
};

const ruleFields: { key: keyof BookingRules; label: string; hint: string; min: number; max: number }[] = [
  { key: "bookingWindowDays", label: "Réservation ouverte sur", hint: "jours à l'avance", min: 1, max: 365 },
  { key: "minNoticeHours", label: "Délai minimum avant un créneau", hint: "heures", min: 0, max: 168 },
  { key: "cancellationNoticeDays", label: "Annulation en ligne jusqu'à", hint: "jours avant le rendez-vous", min: 0, max: 30 },
];

// Règles de réservation et d'annulation
const BookingRulesForm = () => {
  const rules = useSettingsStore((s) => s.rules);
  const setRules = useSettingsStore((s) => s.setRules);
  const { saving, run } = useSave();
  const [draft, setDraft] = useState<Record<keyof BookingRules, string>>({
    bookingWindowDays: String(rules.bookingWindowDays),
    minNoticeHours: String(rules.minNoticeHours),
    cancellationNoticeDays: String(rules.cancellationNoticeDays),
  });

  const errorOf = (field: (typeof ruleFields)[number]) => {
    const value = Number(draft[field.key]);
    return draft[field.key] === "" || !Number.isInteger(value) || value < field.min || value > field.max
      ? `Entre ${field.min} et ${field.max}`
      : undefined;
  };
  const invalid = ruleFields.some((f) => errorOf(f));
  const changed = ruleFields.some((f) => Number(draft[f.key]) !== rules[f.key]);

  return (
    <AdminPanel className="flex flex-col gap-6">
      <div>
        <AdminPanelTitle>Règles de réservation</AdminPanelTitle>
        <p className="mt-1 font-sans text-sm text-taupe">Fenêtre de réservation et délai d&apos;annulation par le client ou la cliente.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {ruleFields.map((field) => (
          <div key={field.key}>
            <label htmlFor={`rule-${field.key}`} className={adminLabelClassName}>
              {field.label}
            </label>
            <div className="flex items-center gap-3">
              <input
                id={`rule-${field.key}`}
                type="number"
                min={field.min}
                max={field.max}
                value={draft[field.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                aria-invalid={!!errorOf(field)}
                className={`${adminInputClassName} w-24!`}
              />
              <span className="font-sans text-sm text-taupe">{field.hint}</span>
            </div>
            <FieldError message={errorOf(field)} />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!changed || invalid || saving}
          onClick={() =>
            run(
              () =>
                setRules({
                  bookingWindowDays: Number(draft.bookingWindowDays),
                  minNoticeHours: Number(draft.minNoticeHours),
                  cancellationNoticeDays: Number(draft.cancellationNoticeDays),
                }),
              () => toast.success("Règles enregistrées"),
            )
          }
          className={adminButtonClassName}
        >
          Enregistrer les règles
        </button>
      </div>
    </AdminPanel>
  );
};

// Jours de fermeture exceptionnelle (congés, jours fériés) : aucun créneau ces jours-là
const ClosedDates = () => {
  const closedDates = useSettingsStore((s) => s.closedDates);
  const addClosedDate = useSettingsStore((s) => s.addClosedDate);
  const removeClosedDate = useSettingsStore((s) => s.removeClosedDate);
  const { saving, run } = useSave();
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const today = toDateKey(new Date());
  const upcoming = closedDates.filter((d) => d.date >= today);

  return (
    <AdminPanel className="flex flex-col gap-6">
      <div>
        <AdminPanelTitle>Fermetures exceptionnelles</AdminPanelTitle>
        <p className="mt-1 font-sans text-sm text-taupe">Congés, jours fériés… Aucun créneau n&apos;est proposé ces jours-là.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!date) return;
          void run(
            () => addClosedDate({ date, label: label.trim() || "Fermeture exceptionnelle" }),
            () => {
              toast.success("Fermeture ajoutée", { description: formatDay(date) });
              setDate("");
              setLabel("");
            },
          );
        }}
        className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end"
      >
        <div>
          <label htmlFor="closed-date" className={adminLabelClassName}>
            Date
          </label>
          <AdminDatePicker id="closed-date" value={date} onChange={setDate} min={today} className="sm:w-52" />
        </div>
        <div>
          <label htmlFor="closed-label" className={adminLabelClassName}>
            Motif
          </label>
          <input
            id="closed-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Fête de l'Indépendance, congés…"
            className={adminInputClassName}
          />
        </div>
        <button type="submit" disabled={!date || saving} className={adminButtonClassName}>
          Ajouter
        </button>
      </form>

      {upcoming.length > 0 ? (
        <ul className="divide-y divide-sand border-y border-sand font-sans text-sm text-cocoa">
          {upcoming.map((d) => (
            <li key={d.date} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="first-letter:uppercase">{formatDay(d.date)}</p>
                <p className="text-xs text-taupe">{d.label}</p>
              </div>
              <button
                type="button"
                onClick={() => run(() => removeClosedDate(d.date), () => toast("Fermeture supprimée"))}
                disabled={saving}
                aria-label={`Supprimer la fermeture du ${formatDay(d.date)}`}
                className="inline-flex size-8 items-center justify-center rounded-full text-taupe transition-colors hover:bg-sand hover:text-cocoa"
              >
                <Trash2 className="size-4" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-sans text-sm text-taupe">Aucune fermeture prévue.</p>
      )}
    </AdminPanel>
  );
};

const parseCoord = (value: string) => Number(value.trim().replace(",", "."));

const coordError = (value: string, limit: number) => {
  const n = parseCoord(value);
  return value.trim() === "" || !Number.isFinite(n) || Math.abs(n) > limit ? `Entre -${limit} et ${limit}` : undefined;
};

// Adresse et position du salon : saisie de la latitude et de la longitude, ou choix sur la carte
const SalonLocationForm = () => {
  const salon = useSettingsStore((s) => s.salon);
  const setSalon = useSettingsStore((s) => s.setSalon);
  const location = useSettingsStore((s) => s.location);
  const { saving, run } = useSave();
  const [address, setAddress] = useState(salon.address);
  const [lat, setLat] = useState(String(location.lat));
  const [lng, setLng] = useState(String(location.lng));
  // Dernière position valide, suivie par le repère de la carte pendant la saisie
  const [mapPoint, setMapPoint] = useState<GeoPoint>(location);
  const [locating, setLocating] = useState(false);

  const latError = coordError(lat, 90);
  const lngError = coordError(lng, 180);
  const addressError = address.trim() ? undefined : "Indiquez l'adresse du salon";
  const invalid = !!(latError || lngError || addressError);
  const changed =
    address.trim() !== salon.address || mapPoint.lat !== location.lat || mapPoint.lng !== location.lng;

  const pick = (point: GeoPoint) => {
    setLat(String(point.lat));
    setLng(String(point.lng));
    setMapPoint(point);
  };

  const typeCoord = (axis: keyof GeoPoint, value: string) => {
    const nextLat = axis === "lat" ? value : lat;
    const nextLng = axis === "lng" ? value : lng;
    if (axis === "lat") setLat(value);
    else setLng(value);
    if (!coordError(nextLat, 90) && !coordError(nextLng, 180)) {
      setMapPoint({ lat: parseCoord(nextLat), lng: parseCoord(nextLng) });
    }
  };

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas disponible sur cet appareil");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        pick({ lat: Number(coords.latitude.toFixed(6)), lng: Number(coords.longitude.toFixed(6)) });
      },
      () => {
        setLocating(false);
        toast.error("Position introuvable", { description: "Autorisez la localisation ou placez le repère sur la carte." });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <AdminPanel className="flex flex-col gap-6">
      <div>
        <AdminPanelTitle>Adresse et position du salon</AdminPanelTitle>
        <p className="mt-1 font-sans text-sm text-taupe">
          L&apos;adresse s&apos;affiche dans le pied de page, la position sert au lien « Itinéraire ». Saisissez la
          latitude et la longitude, ou cliquez sur la carte et déplacez le repère.
        </p>
      </div>

      <div>
        <label htmlFor="salon-address" className={adminLabelClassName}>
          Adresse
        </label>
        <input
          id="salon-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          aria-invalid={!!addressError}
          className={adminInputClassName}
        />
        <FieldError message={addressError} />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <div>
          <label htmlFor="salon-lat" className={adminLabelClassName}>
            Latitude
          </label>
          <input
            id="salon-lat"
            inputMode="decimal"
            value={lat}
            onChange={(e) => typeCoord("lat", e.target.value)}
            aria-invalid={!!latError}
            placeholder="5.36"
            className={adminInputClassName}
          />
          <FieldError message={latError} />
        </div>
        <div>
          <label htmlFor="salon-lng" className={adminLabelClassName}>
            Longitude
          </label>
          <input
            id="salon-lng"
            inputMode="decimal"
            value={lng}
            onChange={(e) => typeCoord("lng", e.target.value)}
            aria-invalid={!!lngError}
            placeholder="-4.0083"
            className={adminInputClassName}
          />
          <FieldError message={lngError} />
        </div>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className={`${adminOutlineButtonClassName} sm:mt-7`}
        >
          <Crosshair className="size-4" strokeWidth={1.75} />
          {locating ? "Localisation…" : "Ma position"}
        </button>
      </div>

      <LocationMap value={mapPoint} onChange={pick} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <a
          href={`https://www.openstreetmap.org/?mlat=${mapPoint.lat}&mlon=${mapPoint.lng}#map=17/${mapPoint.lat}/${mapPoint.lng}`}
          target="_blank"
          rel="noreferrer"
          className="font-sans text-sm text-cocoa underline underline-offset-4"
        >
          Voir sur OpenStreetMap
        </a>
        <div className="flex flex-wrap items-center gap-4">
          {changed && <p className="font-sans text-sm text-taupe">Modifications non enregistrées</p>}
          <button
            type="button"
            disabled={!changed || invalid || saving}
            onClick={() =>
              run(
                () => setSalon({ address: address.trim() }, mapPoint),
                () => toast.success("Adresse et position enregistrées"),
              )
            }
            className={adminButtonClassName}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </AdminPanel>
  );
};

const settingsTabs = [
  { value: "plateforme", label: "Plateforme" },
  { value: "horaires", label: "Horaires et créneaux" },
  { value: "reservation", label: "Réservation" },
  { value: "fermetures", label: "Fermetures" },
  { value: "salon", label: "Salon et position" },
  { value: "livraison", label: "Livraisons et expéditions" },
] as const;

// Le salon n'existe pas encore côté API (GET /parametres en 404) : création une seule fois, avec les valeurs par défaut
const FirstSetup = () => {
  const configure = useSettingsStore((s) => s.configure);
  const { saving, run } = useSave();

  return (
    <AdminPanel className="flex flex-col items-start gap-4">
      <AdminPanelTitle>Configurer le salon</AdminPanelTitle>
      <p className="font-sans text-sm text-taupe">
        Les réglages ne sont pas encore enregistrés : le site affiche des valeurs par défaut. Créez-les une
        première fois, puis ajustez chaque onglet.
      </p>
      <button
        type="button"
        disabled={saving}
        onClick={() => run(configure, () => toast.success("Salon configuré"))}
        className={adminButtonClassName}
      >
        Créer les réglages
      </button>
    </AdminPanel>
  );
};

export const SettingsEditor = () => {
  const hydrated = useSettingsHydrated();
  const configured = useSettingsStore((s) => s.configured);

  if (!hydrated) return <div className="min-h-96" aria-hidden />;

  if (!configured) {
    return (
      <div className="flex flex-col gap-8">
        <AdminPageHeader title="Réglages" description="Première configuration du salon." />
        <FirstSetup />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Réglages" description="Identité de la plateforme, horaires, créneaux, règles de réservation, position du salon et tarifs de livraison." />

      {/* forceMount : les brouillons non enregistrés survivent au changement d'onglet */}
      <Tabs defaultValue="plateforme" className="flex-col gap-6">
        <TabsList
          variant="line"
          aria-label="Catégories de réglages"
          className="h-auto! w-full justify-start gap-2 overflow-x-auto overflow-y-hidden rounded-none border-b border-sand p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {settingsTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="mb-3 h-auto flex-none cursor-pointer rounded-full px-4 py-2 font-sans text-sm font-normal text-taupe after:hidden hover:text-cocoa focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none data-[state=active]:bg-sand! data-[state=active]:text-cocoa"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="plateforme" forceMount className="flex flex-col gap-8 data-[state=inactive]:hidden">
          <PlatformSettings />
        </TabsContent>
        <TabsContent value="horaires" forceMount className="data-[state=inactive]:hidden">
          <OpeningHours />
        </TabsContent>
        <TabsContent value="reservation" forceMount className="data-[state=inactive]:hidden">
          <BookingRulesForm />
        </TabsContent>
        <TabsContent value="fermetures" forceMount className="data-[state=inactive]:hidden">
          <ClosedDates />
        </TabsContent>
        <TabsContent value="salon" forceMount className="data-[state=inactive]:hidden">
          <SalonLocationForm />
        </TabsContent>
        <TabsContent value="livraison" forceMount className="data-[state=inactive]:hidden">
          <ShippingSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

"use client";

import { Trash2 } from "lucide-react";
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
import { FieldError } from "@/components/forms/form-fields";
import {
  daySlotTimes,
  formatDay,
  formatSlotTime,
  toDateKey,
  weekdayNames,
  type BookingRules,
  type DayHours,
} from "@/lib/reservations";
import { useSettingsHydrated, useSettingsStore, type SalonInfo } from "@/lib/stores/settings-store";
import { emailSchema } from "@/lib/validation";

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
  const setDay = useSettingsStore((s) => s.setDay);
  const setSlotFormat = useSettingsStore((s) => s.setSlotFormat);
  const [draft, setDraft] = useState(week);
  const [minutes, setMinutes] = useState(slotMinutes);
  const [capacity, setCapacity] = useState(String(slotCapacity));

  const capacityValue = Number(capacity);
  const capacityError =
    !Number.isInteger(capacityValue) || capacityValue < 1 || capacityValue > 20 ? "Entre 1 et 20 places" : undefined;
  const errors = draft.map(dayError);
  const invalid = errors.some(Boolean) || !!capacityError;
  const changed =
    JSON.stringify(draft) !== JSON.stringify(week) || minutes !== slotMinutes || capacityValue !== slotCapacity;

  const update = (index: number, changes: Partial<DayHours>) =>
    setDraft((d) => d.map((day, i) => (i === index ? { ...day, ...changes } : day)));

  const save = () => {
    draft.forEach((day, i) => setDay(i, day));
    setSlotFormat(minutes, capacityValue);
    toast.success("Horaires enregistrés", { description: "Les créneaux du site sont mis à jour." });
  };

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
          <input
            id="slot-capacity"
            type="number"
            min={1}
            max={20}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            aria-invalid={!!capacityError}
            className={adminInputClassName}
          />
          <FieldError message={capacityError} />
        </div>
      </div>

      <ul className="divide-y divide-sand border-y border-sand font-sans text-sm text-cocoa">
        {weekOrder.map((index) => {
          const day = draft[index];
          const slots = errors[index] ? [] : daySlotTimes(day, minutes);
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
                          className="text-xs whitespace-nowrap text-cocoa underline underline-offset-4"
                        >
                          sans pause
                        </button>
                      )}
                    </div>
                  </div>
                  {errors[index] ? (
                    <FieldError message={errors[index]} />
                  ) : (
                    <p className="text-xs text-taupe">
                      {slots.length > 0
                        ? `${slots.length} créneau${slots.length > 1 ? "x" : ""} : ${slots.map((s) => formatSlotTime(s.start, s.end)).join(", ")}`
                        : "Aucun créneau : la durée dépasse les heures d'ouverture."}
                    </p>
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
        <button type="button" onClick={save} disabled={!changed || invalid} className={adminButtonClassName}>
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
        <p className="mt-1 font-sans text-sm text-taupe">Fenêtre de réservation et délai d&apos;annulation par la cliente.</p>
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
          disabled={!changed || invalid}
          onClick={() => {
            setRules({
              bookingWindowDays: Number(draft.bookingWindowDays),
              minNoticeHours: Number(draft.minNoticeHours),
              cancellationNoticeDays: Number(draft.cancellationNoticeDays),
            });
            toast.success("Règles enregistrées");
          }}
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
          addClosedDate({ date, label: label.trim() || "Fermeture exceptionnelle" });
          toast.success("Fermeture ajoutée", { description: formatDay(date) });
          setDate("");
          setLabel("");
        }}
        className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end"
      >
        <div>
          <label htmlFor="closed-date" className={adminLabelClassName}>
            Date
          </label>
          <input
            id="closed-date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${adminInputClassName} sm:w-44`}
          />
        </div>
        <div>
          <label htmlFor="closed-label" className={adminLabelClassName}>
            Motif <span className="text-taupe">(facultatif)</span>
          </label>
          <input
            id="closed-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Fête de l'Indépendance, congés…"
            className={adminInputClassName}
          />
        </div>
        <button type="submit" disabled={!date} className={adminButtonClassName}>
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
                onClick={() => removeClosedDate(d.date)}
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

// Coordonnées affichées dans le pied de page du site
const SalonContactForm = () => {
  const salon = useSettingsStore((s) => s.salon);
  const setSalon = useSettingsStore((s) => s.setSalon);
  const [draft, setDraft] = useState<SalonInfo>(salon);
  const emailError = emailSchema.safeParse(draft.email.trim()).success ? undefined : "Adresse e-mail invalide";
  const phoneError = draft.phone.replace(/\D/g, "").length < 8 ? "Numéro de téléphone invalide" : undefined;
  const addressError = draft.address.trim() ? undefined : "Indiquez l'adresse du salon";
  const changed = JSON.stringify(draft) !== JSON.stringify(salon);

  const fields: { key: keyof SalonInfo; label: string; type: string; error?: string }[] = [
    { key: "address", label: "Adresse", type: "text", error: addressError },
    { key: "phone", label: "Téléphone", type: "tel", error: phoneError },
    { key: "email", label: "E-mail", type: "email", error: emailError },
  ];

  return (
    <AdminPanel className="flex flex-col gap-6">
      <div>
        <AdminPanelTitle>Coordonnées du salon</AdminPanelTitle>
        <p className="mt-1 font-sans text-sm text-taupe">Affichées dans le pied de page de toutes les pages.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label htmlFor={`salon-${field.key}`} className={adminLabelClassName}>
              {field.label}
            </label>
            <input
              id={`salon-${field.key}`}
              type={field.type}
              value={draft[field.key]}
              onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
              aria-invalid={!!field.error}
              className={adminInputClassName}
            />
            <FieldError message={field.error} />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!changed || !!(emailError || phoneError || addressError)}
          onClick={() => {
            setSalon({ address: draft.address.trim(), phone: draft.phone.trim(), email: draft.email.trim() });
            toast.success("Coordonnées enregistrées");
          }}
          className={adminButtonClassName}
        >
          Enregistrer les coordonnées
        </button>
      </div>
    </AdminPanel>
  );
};

export const SettingsEditor = () => {
  const hydrated = useSettingsHydrated();
  const reset = useSettingsStore((s) => s.reset);
  // Remonte les formulaires après une réinitialisation pour relire les valeurs
  const [version, setVersion] = useState(0);

  if (!hydrated) return <div className="min-h-96" aria-hidden />;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Réglages" description="Horaires, créneaux, règles de réservation et coordonnées du salon.">
        <button
          type="button"
          onClick={() => {
            reset();
            setVersion((v) => v + 1);
            toast("Réglages par défaut rétablis");
          }}
          className={adminOutlineButtonClassName}
        >
          Rétablir les valeurs par défaut
        </button>
      </AdminPageHeader>

      <div key={version} className="flex flex-col gap-8">
        <OpeningHours />
        <BookingRulesForm />
        <ClosedDates />
        <SalonContactForm />
      </div>
    </div>
  );
};

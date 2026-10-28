"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  FieldError,
  inputClassName,
  labelClassName,
  NewPasswordFields,
  PhoneInput,
  Required,
  submitClassName,
} from "@/components/forms/form-fields";
import { errorMessage } from "@/lib/api/client";
import { formatPrice } from "@/lib/prestations";
import { contactChannels, formatDay, formatNotice, formatSlotTime, type Reservation } from "@/lib/reservations";
import { selectCurrentAccount, useAuthHydrated, useAuthStore } from "@/lib/stores/auth-store";
import { useBookingStore } from "@/lib/stores/booking-store";
import { useAllPrestations } from "@/lib/stores/prestations-store";
import { useReservationStore } from "@/lib/stores/reservation-store";
import { useSettingsHydrated, useSettingsStore } from "@/lib/stores/settings-store";
import { useSlotsLoaded, useSlotsStore } from "@/lib/stores/slots-store";
import {
  emailSchema,
  nameSchema,
  PASSWORD_MIN_LENGTH,
  phoneSchema,
  textSchema,
  withDialCode,
} from "@/lib/validation";
import { BookingConfirmation } from "./booking-confirmation";
import { PrestationPicker } from "./prestation-picker";
import { SlotPicker } from "./slot-picker";

// Réserver exige un compte : la cliente connectée réserve avec les coordonnées de son compte, les autres
// créent leur compte dans ce formulaire (champs du compte vérifiés seulement dans ce cas)
const accountChecks = {
  firstName: nameSchema("Indiquez votre prénom", "Entrer un prénom correct"),
  lastName: nameSchema("Indiquez votre nom", "Entrer un nom correct"),
  phone: phoneSchema,
  whatsapp: z.union([z.literal(""), phoneSchema]),
  email: z.string().trim().min(1, "L'adresse e-mail est nécessaire pour créer votre compte").pipe(emailSchema),
} as const;

const clientSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string(),
    whatsapp: z.string(),
    email: z.string(),
    contactChannel: z.enum(["whatsapp", "appel", "sms", "email"]),
    note: textSchema(0, "", "Entrer un texte correct").max(500, "500 caractères maximum"),
    // Vrai sans session : le compte est créé avant d'envoyer la demande
    createAccount: z.boolean(),
    password: z.string(),
    confirmPassword: z.string(),
    acceptPolicy: z.boolean().refine((v) => v, "Merci de confirmer avoir pris connaissance des conditions"),
  })
  .superRefine((values, ctx) => {
    if (!values.createAccount) return;
    for (const [field, schema] of Object.entries(accountChecks)) {
      const result = schema.safeParse(values[field as keyof typeof accountChecks]);
      if (!result.success) {
        ctx.addIssue({ code: "custom", path: [field], message: result.error.issues[0].message });
      }
    }
    if (values.password.length < PASSWORD_MIN_LENGTH) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: `Au moins ${PASSWORD_MIN_LENGTH} caractères`,
      });
    }
    if (values.confirmPassword !== values.password) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Les mots de passe ne correspondent pas",
      });
    }
  });

type ClientValues = z.infer<typeof clientSchema>;

const LOGIN_HREF = "/connexion?redirect=/reservation";

const Step = ({ number, title, children }: { number: number; title: string; children: ReactNode }) => (
  <section aria-labelledby={`step-${number}`} className="border-b border-sand pb-12">
    <h2
      id={`step-${number}`}
      className="flex items-baseline gap-4 font-serif text-[clamp(1.4rem,2vw,1.75rem)] text-cocoa"
    >
      <span className="font-sans text-sm text-taupe">0{number}</span>
      {title}
    </h2>
    <div className="mt-8">{children}</div>
  </section>
);

// Parcours de réservation : prestations, créneau, coordonnées (compte), puis récapitulatif
export const BookingFlow = () => {
  const authHydrated = useAuthHydrated();
  const settingsHydrated = useSettingsHydrated();
  const slotsLoaded = useSlotsLoaded();
  const slots = useSlotsStore((s) => s.slots);
  const slotsError = useSlotsStore((s) => s.loadError);
  const reloadSlots = useSlotsStore((s) => s.load);
  const noticeHours = useSettingsStore((s) => s.rules.cancellationNoticeHours);
  const allPrestations = useAllPrestations();
  const selectedIds = useBookingStore((s) => s.selectedIds);
  const slotId = useBookingStore((s) => s.slotId);
  const setSlotId = useBookingStore((s) => s.setSlot);
  const clearSelection = useBookingStore((s) => s.clear);
  const addReservation = useReservationStore((s) => s.add);
  const account = useAuthStore(selectCurrentAccount);
  const signUp = useAuthStore((s) => s.signUp);
  const signOut = useAuthStore((s) => s.signOut);

  const [day, setDay] = useState<string>();
  const [confirmed, setConfirmed] = useState<{ reservation: Reservation; accountCreated: boolean }>();

  useEffect(() => {
    useBookingStore.persist.rehydrate();
  }, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    // Chaque champ est vérifié dès qu'on le quitte, puis à chaque frappe
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      whatsapp: "",
      email: "",
      contactChannel: "whatsapp",
      note: "",
      createAccount: true,
      password: "",
      confirmPassword: "",
      acceptPolicy: false,
    },
  });
  const values = useWatch({ control });

  // Connexion ou déconnexion : le compte à créer n'est demandé qu'aux visiteurs non connectés
  useEffect(() => {
    reset({ ...getValues(), createAccount: !account, password: "", confirmPassword: "" });
  }, [account, reset, getValues]);

  // Adresse refusée par l'API à la création du compte (409) : l'alerte disparaît dès que l'e-mail change
  const [takenEmail, setTakenEmail] = useState<string>();
  const emailTaken = !!takenEmail && takenEmail === values.email?.trim().toLowerCase();

  // Le contenu dépend du navigateur (sélection, session) et de l'API (créneaux) : rien côté serveur
  if (!authHydrated || !settingsHydrated || !slotsLoaded) {
    return <div className="min-h-96" aria-hidden />;
  }

  if (confirmed) return <BookingConfirmation {...confirmed} />;

  const filled = (value?: string) => !!value?.trim();
  const createAccount = !account;
  const password = values.password ?? "";
  const confirmPassword = values.confirmPassword ?? "";
  const passwordValid = !createAccount || (password.length >= PASSWORD_MIN_LENGTH && confirmPassword === password);

  const selected = allPrestations.filter((p) => selectedIds.includes(p.id));
  const total = selected.reduce((sum, p) => sum + p.price, 0);
  const hasFromPrice = selected.some((p) => p.fromPrice);
  const slot = slots.find((s) => s.id === slotId && s.remaining !== 0);

  // Ce qu'il reste à compléter avant de pouvoir envoyer la demande
  const missing = [
    selected.length === 0 && "vos prestations",
    !slot && "un créneau",
    createAccount &&
      !(
        filled(values.firstName) &&
        filled(values.lastName) &&
        filled(values.phone) &&
        filled(values.email) &&
        filled(password) &&
        filled(confirmPassword)
      ) &&
      "vos coordonnées",
    filled(password) && filled(confirmPassword) && !passwordValid && "un mot de passe valide",
    createAccount && emailTaken && "connectez-vous à votre compte existant",
    !values.acceptPolicy && "les conditions d'annulation",
  ].filter(Boolean);

  const changeDay = (next: string) => {
    setDay(next);
    setSlotId(null);
  };

  const onSubmit = async (values: ClientValues) => {
    if (selected.length === 0 || !slot) return;

    if (createAccount) {
      let result: Awaited<ReturnType<typeof signUp>>;
      try {
        result = await signUp({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phone: withDialCode(values.phone),
          // Sans numéro WhatsApp dédié, on contacte la cliente sur son téléphone
          whatsapp: values.whatsapp ? withDialCode(values.whatsapp) : undefined,
          email: values.email.trim(),
          password: values.password,
        });
      } catch (error) {
        toast.error("Votre compte n'a pas été créé, la demande n'est pas partie", {
          description: errorMessage(error),
        });
        return;
      }
      if (!result.ok) {
        setTakenEmail(values.email.trim().toLowerCase());
        return;
      }
    }

    try {
      const reservation = await addReservation({
        prestationIds: selected.map((p) => p.id),
        date: slot.date,
        start: slot.start,
        contactChannel: values.contactChannel,
        note: values.note.trim() || undefined,
      });
      clearSelection();
      setConfirmed({ reservation, accountCreated: createAccount });
      window.scrollTo({ top: 0 });
    } catch (error) {
      toast.error("Votre demande de réservation n'a pas été envoyée", {
        description: createAccount
          ? `${errorMessage(error)} · Votre compte est bien créé et vous êtes connectée : vous pouvez réessayer.`
          : errorMessage(error),
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-16"
    >
      <div className="flex flex-col gap-12">
        <Step number={1} title="Vos prestations">
          <PrestationPicker />
        </Step>

        <Step number={2} title="Date et créneau">
          {slotsError ? (
            <div role="alert" className="rounded-[var(--radius)] bg-sand px-5 py-4 font-sans text-sm text-cocoa">
              <p>Les créneaux n&apos;ont pas pu être chargés : {slotsError}</p>
              <button type="button" onClick={() => void reloadSlots()} className="mt-2 underline underline-offset-4">
                Réessayer
              </button>
            </div>
          ) : (
          <SlotPicker
            slots={slots}
            day={day ?? slot?.date}
            onDayChange={changeDay}
            slotId={slotId ?? undefined}
            onSlotChange={setSlotId}
          />
          )}
        </Step>

        <Step number={3} title="Vos coordonnées">
          {account ? (
            <div className="rounded-[var(--radius)] bg-sand px-5 py-4 font-sans text-sm text-cocoa">
              <p>
                Connectée en tant que {account.firstName} {account.lastName} : le salon vous recontactera avec
                les coordonnées de votre compte.{" "}
                <button type="button" onClick={signOut} className="underline underline-offset-4">
                  Ce n&apos;est pas vous ?
                </button>
              </p>
              <p className="mt-2 text-taupe">
                {account.phone}
                {account.whatsapp && ` · WhatsApp ${account.whatsapp}`} · {account.email}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-8 rounded-[var(--radius)] border border-sand px-5 py-4 font-sans text-sm text-cocoa">
                Déjà cliente ?{" "}
                <Link href={LOGIN_HREF} className="underline underline-offset-4">
                  Connectez-vous
                </Link>{" "}
                pour réserver avec votre compte. Sinon, créez-le ici : il vous permet de suivre et d&apos;annuler
                vos réservations.
              </p>

              <p className="mb-10 font-sans text-sm text-taupe">* champs obligatoires</p>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className={labelClassName}>
                    Prénom<Required />
                  </label>
                  <input
                    id="firstName"
                    autoComplete="given-name"
                    aria-required
                    aria-invalid={!!errors.firstName}
                    className={inputClassName}
                    {...register("firstName")}
                  />
                  <FieldError message={errors.firstName?.message} />
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClassName}>
                    Nom<Required />
                  </label>
                  <input
                    id="lastName"
                    autoComplete="family-name"
                    aria-required
                    aria-invalid={!!errors.lastName}
                    className={inputClassName}
                    {...register("lastName")}
                  />
                  <FieldError message={errors.lastName?.message} />
                </div>
                <div>
                  <label htmlFor="phone" className={labelClassName}>
                    Téléphone<Required />
                  </label>
                  <PhoneInput id="phone" aria-required aria-invalid={!!errors.phone} {...register("phone")} />
                  <FieldError message={errors.phone?.message} />
                </div>
                <div>
                  <label htmlFor="whatsapp" className={labelClassName}>
                    Numéro WhatsApp
                  </label>
                  <PhoneInput
                    id="whatsapp"
                    aria-invalid={!!errors.whatsapp}
                    aria-describedby="whatsapp-hint"
                    {...register("whatsapp")}
                  />
                  <p id="whatsapp-hint" className="mt-2 font-sans text-xs text-taupe">
                    Laissez vide s&apos;il s&apos;agit du même numéro.
                  </p>
                  <FieldError message={errors.whatsapp?.message} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="email" className={labelClassName}>
                    E-mail<Required />
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-required
                    aria-invalid={!!errors.email || emailTaken}
                    className={inputClassName}
                    {...register("email")}
                  />
                  <FieldError message={errors.email?.message} />
                </div>
              </div>

              {emailTaken ? (
                <p role="alert" className="mt-6 rounded-[var(--radius)] bg-sand px-5 py-4 font-sans text-sm text-cocoa">
                  Vous avez déjà un compte avec l&apos;adresse {values.email}.{" "}
                  <Link href={LOGIN_HREF} className="underline underline-offset-4">
                    Connectez-vous
                  </Link>{" "}
                  pour réserver avec votre compte.
                </p>
              ) : (
                <div className="mt-6">
                  <NewPasswordFields
                    password={password}
                    confirmPassword={confirmPassword}
                    passwordProps={register("password")}
                    confirmProps={register("confirmPassword")}
                    passwordError={errors.password?.message}
                    confirmError={errors.confirmPassword?.message}
                  />
                </div>
              )}
            </>
          )}

          <fieldset className="mt-8">
            <legend className="font-sans text-sm text-cocoa">
              Comment préférez-vous être contactée ?<Required />
            </legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {contactChannels.map((channel) => (
                <label
                  key={channel.value}
                  className="cursor-pointer rounded-full border border-sand px-5 py-2 font-sans text-sm text-cocoa transition-colors hover:bg-sand has-checked:border-cocoa has-checked:bg-sand has-focus-visible:border-taupe"
                >
                  <input
                    type="radio"
                    value={channel.value}
                    className="sr-only"
                    {...register("contactChannel")}
                  />
                  {channel.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-8">
            <label htmlFor="note" className={labelClassName}>
              Une précision ?
            </label>
            <textarea
              id="note"
              rows={3}
              placeholder="Allergie, inspiration, couleur souhaitée…"
              aria-invalid={!!errors.note}
              className="w-full rounded-[var(--radius)] border border-sand bg-pearl px-5 py-3 font-sans text-base text-cocoa outline-none transition-colors placeholder:text-taupe focus-visible:border-taupe aria-invalid:border-destructive"
              {...register("note")}
            />
            <FieldError message={errors.note?.message} />
          </div>

          <label className="mt-8 flex cursor-pointer items-start gap-3 font-sans text-sm text-cocoa">
            <input
              type="checkbox"
              aria-required
              className="mt-0.5 size-4 accent-cocoa"
              {...register("acceptPolicy")}
            />
            <span>
              {noticeHours
                ? `J'ai bien noté que je peux annuler ma réservation en ligne jusqu'à ${formatNotice(noticeHours)} avant le rendez-vous. Passé ce délai, je contacte le salon.`
                : "J'ai bien noté que je peux annuler ma réservation en ligne jusqu'au début du rendez-vous."}
              <Required />
            </span>
          </label>
          <FieldError message={errors.acceptPolicy?.message} />
        </Step>
      </div>

      {/* Récapitulatif : reste visible pendant le défilement sur grand écran */}
      <aside
        aria-label="Récapitulatif de la réservation"
        className="rounded-[var(--radius)] border border-sand p-6 md:p-8 lg:sticky lg:top-32"
      >
        <h2 className="font-serif text-[clamp(1.4rem,2vw,1.75rem)] text-cocoa">Récapitulatif</h2>

        {selected.length > 0 ? (
          <ul className="mt-6 flex flex-col gap-3 border-b border-sand pb-6 font-sans text-sm text-cocoa">
            {selected.map((p) => (
              <li key={p.id} className="flex justify-between gap-4">
                <span>{p.name}</span>
                <span className="whitespace-nowrap">{formatPrice(p.price, p.fromPrice)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 border-b border-sand pb-6 font-sans text-sm text-taupe">
            Aucune prestation choisie.
          </p>
        )}

        <div className="mt-6 border-b border-sand pb-6 font-sans text-sm">
          {slot ? (
            <p className="text-cocoa">
              <span className="block first-letter:uppercase">{formatDay(slot.date)}</span>
              <span className="text-taupe">{formatSlotTime(slot.start, slot.end)}</span>
            </p>
          ) : (
            <p className="text-taupe">Aucun créneau choisi.</p>
          )}
        </div>

        <div className="mt-6 flex items-baseline justify-between gap-4 text-cocoa">
          <p className="font-serif text-lg">Total estimé</p>
          <p className="font-sans text-lg">{formatPrice(total, hasFromPrice)}</p>
        </div>
        {hasFromPrice && (
          <p className="mt-2 font-sans text-sm text-taupe">
            Le tarif final dépend de la prestation réalisée.
          </p>
        )}

        <button
          type="submit"
          disabled={missing.length > 0 || isSubmitting}
          aria-describedby="submit-hint"
          className={`mt-8 ${submitClassName}`}
        >
          Envoyer ma demande
        </button>
        <p id="submit-hint" className="mt-4 text-center font-sans text-sm text-taupe">
          {missing.length > 0
            ? `Pour envoyer votre demande, complétez : ${missing.join(", ")}.`
            : "Votre réservation sera confirmée par notre équipe."}
        </p>
      </aside>
    </form>
  );
};

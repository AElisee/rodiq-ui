"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
import { selectCurrentAccount, useAuthHydrated, useAuthStore } from "@/lib/stores/auth-store";
import {
  emailSchema,
  nameSchema,
  PASSWORD_MIN_LENGTH,
  phoneSchema,
  safeRedirect,
  withDialCode,
} from "@/lib/validation";

const signUpSchema = z
  .object({
    firstName: nameSchema("Indiquez votre prénom", "Entrer un prénom correct"),
    lastName: nameSchema("Indiquez votre nom", "Entrer un nom correct"),
    phone: phoneSchema,
    whatsapp: z.union([z.literal(""), phoneSchema]),
    email: emailSchema,
    password: z.string().min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères`),
    confirmPassword: z.string(),
  })
  .refine((v) => v.confirmPassword === v.password, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  });

type SignUpValues = z.infer<typeof signUpSchema>;

export const SignUpForm = () => {
  const router = useRouter();
  const redirect = safeRedirect(useSearchParams().get("redirect"), "/reservation/mes-reservations");
  const hydrated = useAuthHydrated();
  const account = useAuthStore(selectCurrentAccount);
  const signUp = useAuthStore((s) => s.signUp);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    // Chaque champ est vérifié dès qu'on le quitte, puis à chaque frappe
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      whatsapp: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const values = useWatch({ control });
  // Adresse refusée par l'API (409) : l'alerte disparaît dès que l'e-mail change
  const [takenEmail, setTakenEmail] = useState<string>();
  const emailTaken = !!takenEmail && takenEmail === values.email?.trim().toLowerCase();
  const loginHref = `/connexion?redirect=${encodeURIComponent(redirect)}`;

  // La session est relue depuis le navigateur : rien à afficher côté serveur
  if (!hydrated) return <div className="min-h-96" aria-hidden />;

  // Déjà connectée (hors redirection juste après l'inscription)
  if (account && !isSubmitting && !isSubmitSuccessful) {
    return (
      <div className="flex flex-col items-center text-center">
        <p className="font-serif text-[clamp(1.25rem,2vw,1.75rem)] text-cocoa">
          Vous avez déjà un compte, {account.firstName}.
        </p>
        <Link
          href={redirect}
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Continuer
        </Link>
      </div>
    );
  }

  const filled = (value?: string) => !!value?.trim();
  const password = values.password ?? "";
  const confirmPassword = values.confirmPassword ?? "";
  const complete =
    filled(values.firstName) &&
    filled(values.lastName) &&
    filled(values.phone) &&
    filled(values.email) &&
    password.length >= PASSWORD_MIN_LENGTH &&
    confirmPassword === password;

  const onSubmit = async (values: SignUpValues) => {
    let result: Awaited<ReturnType<typeof signUp>>;
    try {
      result = await signUp({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: withDialCode(values.phone),
        whatsapp: values.whatsapp ? withDialCode(values.whatsapp) : undefined,
        email: values.email,
        password: values.password,
      });
    } catch (error) {
      toast.error("Inscription impossible", { description: errorMessage(error) });
      return;
    }
    if (!result.ok) {
      setTakenEmail(values.email.trim().toLowerCase());
      return;
    }

    toast(`Bienvenue ${values.firstName}`, { description: "Votre compte RODIQ est créé." });
    router.replace(redirect);
  };

  return (
    <>
      <p className="text-center font-serif text-[clamp(1rem,1.3vw,1.15rem)] text-taupe italic">
        Réservez plus vite et retrouvez vos réservations depuis n&apos;importe quel appareil.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10">
        <p className="mb-8 font-sans text-sm text-taupe">* champs obligatoires</p>

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
            {emailTaken && (
              <p role="alert" className="mt-3 rounded-[var(--radius)] bg-sand px-5 py-4 font-sans text-sm text-cocoa">
                Un compte existe déjà avec cette adresse.{" "}
                <Link href={loginHref} className="underline underline-offset-4">
                  Connectez-vous
                </Link>
              </p>
            )}
          </div>
        </div>

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

        <button
          type="submit"
          disabled={!complete || emailTaken || isSubmitting}
          className={`mt-10 ${submitClassName}`}
        >
          Créer mon compte
        </button>
      </form>

      <p className="mt-10 border-t border-sand pt-8 text-center font-sans text-sm text-taupe">
        Déjà un compte ?{" "}
        <Link href={loginHref} className="text-cocoa underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </>
  );
};

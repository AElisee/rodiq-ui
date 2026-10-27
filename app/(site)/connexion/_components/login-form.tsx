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
  PasswordInput,
  submitClassName,
} from "@/components/forms/form-fields";
import { errorMessage } from "@/lib/api/client";
import { selectCurrentAccount, useAuthHydrated, useAuthStore } from "@/lib/stores/auth-store";
import { safeRedirect } from "@/lib/validation";

const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(1, "Indiquez votre mot de passe"),
});

type LoginValues = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const router = useRouter();
  const redirect = safeRedirect(useSearchParams().get("redirect"), "/reservation/mes-reservations");
  const hydrated = useAuthHydrated();
  const account = useAuthStore(selectCurrentAccount);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const [failed, setFailed] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });
  const [email, password] = useWatch({ control, name: ["email", "password"] });

  // La session est relue depuis le navigateur : rien à afficher côté serveur
  if (!hydrated) return <div className="min-h-96" aria-hidden />;

  // Après connexion, on quitte la page : ne pas afficher l'écran « déjà connectée » entre-temps
  if (account && !isSubmitting && !isSubmitSuccessful) {
    return (
      <div className="flex flex-col items-center text-center">
        <p className="font-serif text-[clamp(1.25rem,2vw,1.75rem)] text-cocoa">
          Vous êtes connectée en tant que {account.firstName} {account.lastName}.
        </p>
        <Link
          href={redirect}
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Continuer
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="mt-4 font-sans text-sm text-cocoa underline-offset-4 hover:underline"
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  const onSubmit = async (values: LoginValues) => {
    let ok: boolean;
    try {
      ok = await signIn(values.email, values.password);
    } catch (error) {
      toast.error("Connexion impossible", { description: errorMessage(error) });
      return;
    }
    setFailed(!ok);
    if (!ok) return;

    const { firstName } = selectCurrentAccount(useAuthStore.getState()) ?? {};
    toast(`Bonjour ${firstName}`, { description: "Vous êtes connectée." });
    router.replace(redirect);
  };

  return (
    <>
      <p className="text-center font-serif text-[clamp(1rem,1.3vw,1.15rem)] text-taupe italic">
        Retrouvez vos coordonnées et suivez vos réservations.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10 flex flex-col gap-6">
        {failed && (
          <p role="alert" className="rounded-[var(--radius)] bg-sand px-5 py-4 font-sans text-sm text-cocoa">
            E-mail ou mot de passe incorrect.
          </p>
        )}

        <div>
          <label htmlFor="email" className={labelClassName}>
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            className={inputClassName}
            {...register("email", { onChange: () => setFailed(false) })}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <label htmlFor="password" className={labelClassName}>
            Mot de passe
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password", { onChange: () => setFailed(false) })}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <button
          type="submit"
          disabled={!email.trim() || !password || isSubmitting}
          className={`mt-2 ${submitClassName}`}
        >
          Se connecter
        </button>
      </form>

      <p className="mt-10 border-t border-sand pt-8 text-center font-sans text-sm text-taupe">
        Pas encore de compte ?{" "}
        <Link
          href={`/inscription?redirect=${encodeURIComponent(redirect)}`}
          className="text-cocoa underline underline-offset-4"
        >
          Créer un compte
        </Link>
      </p>
    </>
  );
};

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError, PasswordInput } from "@/components/forms/form-fields";
import { adminButtonClassName, adminInputClassName, adminLabelClassName, PendingLabel } from "@/components/admin/admin-ui";
import { errorMessage } from "@/lib/api/client";
import { useAdminHydrated, useAdminStore } from "@/lib/stores/admin-store";
import { safeRedirect } from "@/lib/validation";

const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(1, "Indiquez votre mot de passe"),
});

type LoginValues = z.infer<typeof loginSchema>;

export const AdminLoginForm = () => {
  const router = useRouter();
  const redirectParam = safeRedirect(useSearchParams().get("redirect"), "/admin");
  // Seules les pages de l'admin sont des destinations valides
  const redirect = redirectParam.startsWith("/admin") ? redirectParam : "/admin";
  const hydrated = useAdminHydrated();
  const email = useAdminStore((s) => s.email);
  const signIn = useAdminStore((s) => s.signIn);
  const [failed, setFailed] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });
  const [emailValue, password] = useWatch({ control, name: ["email", "password"] });

  // Déjà connecté : direction l'espace admin
  useEffect(() => {
    if (hydrated && email) router.replace(redirect);
  }, [hydrated, email, redirect, router]);

  if (!hydrated || email) return <div className="min-h-72" aria-hidden />;

  const onSubmit = async (values: LoginValues) => {
    try {
      setFailed(!(await signIn(values.email, values.password)));
    } catch (error) {
      toast.error("Connexion impossible", { description: errorMessage(error) });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10 flex flex-col gap-5">
      {failed && (
        <p role="alert" className="rounded-[var(--radius)] bg-sand px-5 py-4 font-sans text-sm text-cocoa">
          E-mail ou mot de passe incorrect.
        </p>
      )}

      <div>
        <label htmlFor="email" className={adminLabelClassName}>
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!!errors.email}
          className={`${adminInputClassName} h-12 text-base`}
          {...register("email", { onChange: () => setFailed(false) })}
        />
        <FieldError message={errors.email?.message} />
      </div>

      <div>
        <label htmlFor="password" className={adminLabelClassName}>
          Mot de passe
        </label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          aria-invalid={!!errors.password}
          {...register("password", { onChange: () => setFailed(false) })}
        />
        <FieldError message={errors.password?.message} />
      </div>

      <button
        type="submit"
        disabled={!emailValue.trim() || !password || isSubmitting}
        className={`mt-3 h-12 w-full text-base ${adminButtonClassName}`}
      >
        <PendingLabel pending={isSubmitting} pendingLabel="Connexion…">Se connecter</PendingLabel>
      </button>

      <p className="text-center font-sans text-xs text-taupe">
        Accès réservé à l&apos;équipe RODIQ. Mot de passe oublié : contactez l&apos;administrateur.
      </p>
    </form>
  );
};

"use client";

import { Check, Eye, EyeOff, X } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { CI_DIAL_CODE, formatPhone, PASSWORD_MIN_LENGTH } from "@/lib/validation";
import { cn } from "@/lib/utils";

// Champs de formulaire aux couleurs de la charte, partagés par les formulaires clientes

export const inputClassName =
  "h-12 w-full rounded-full border border-sand bg-pearl px-5 font-sans text-base text-cocoa outline-none transition-colors placeholder:text-taupe focus-visible:border-taupe aria-invalid:border-destructive";

export const labelClassName = "mb-2 block font-sans text-sm text-cocoa";

// Bouton d'envoi : désactivé (beige) tant que le formulaire est incomplet
export const submitClassName =
  "inline-flex h-14 w-full items-center justify-center rounded-full bg-blush px-8 font-sans text-base text-cocoa transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:bg-sand disabled:text-taupe";

export const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-2 font-sans text-sm text-destructive">{message}</p> : null;

// Marque un champ obligatoire (l'information est aussi portée par aria-required)
export const Required = () => <span aria-hidden> *</span>;

// Champ mot de passe avec bouton pour afficher / masquer la saisie
export const PasswordInput = ({ id, className, ...props }: ComponentProps<"input"> & { id: string }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        className={cn(inputClassName, "pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-controls={id}
        className="absolute top-1/2 right-4 -translate-y-1/2 text-taupe transition-colors hover:text-cocoa"
      >
        {visible ? (
          <EyeOff className="size-5" strokeWidth={1.5} />
        ) : (
          <Eye className="size-5" strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
};

// Téléphone ivoirien : indicatif fixe, chiffres uniquement, mis en forme pendant la saisie
export const PhoneInput = ({ onChange, className, ...props }: ComponentProps<"input">) => (
  <div className="relative">
    <span className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 font-sans text-base text-taupe">
      {CI_DIAL_CODE}
    </span>
    <input
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder="07 00 00 00 00"
      className={cn(inputClassName, "pl-16", className)}
      onChange={(e) => {
        e.target.value = formatPhone(e.target.value);
        onChange?.(e);
      }}
      {...props}
    />
  </div>
);

// Indication sous un champ : neutre, validée (coche) ou en erreur (croix)
export const LiveHint = ({
  id,
  state,
  children,
}: {
  id: string;
  state: "idle" | "valid" | "invalid";
  children: ReactNode;
}) => (
  <p
    id={id}
    aria-live="polite"
    className={cn(
      "mt-2 flex items-center gap-1.5 font-sans text-sm",
      state === "idle" && "text-taupe",
      state === "valid" && "text-cocoa",
      state === "invalid" && "text-destructive",
    )}
  >
    {state === "valid" && <Check className="size-4 shrink-0" strokeWidth={1.75} />}
    {state === "invalid" && <X className="size-4 shrink-0" strokeWidth={1.75} />}
    {children}
  </p>
);

// Mot de passe + confirmation, vérifiés pendant la saisie
export const NewPasswordFields = ({
  password,
  confirmPassword,
  passwordProps,
  confirmProps,
  passwordError,
  confirmError,
}: {
  password: string;
  confirmPassword: string;
  passwordProps: ComponentProps<"input">;
  confirmProps: ComponentProps<"input">;
  passwordError?: string;
  confirmError?: string;
}) => {
  const longEnough = password.length >= PASSWORD_MIN_LENGTH;
  const match = confirmPassword === password;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <label htmlFor="password" className={labelClassName}>
          Mot de passe<Required />
        </label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-required
          aria-invalid={!!password && !longEnough}
          aria-describedby="password-hint"
          {...passwordProps}
        />
        <LiveHint
          id="password-hint"
          state={longEnough ? "valid" : password || passwordError ? "invalid" : "idle"}
        >
          Au moins {PASSWORD_MIN_LENGTH} caractères
        </LiveHint>
      </div>
      <div>
        <label htmlFor="confirmPassword" className={labelClassName}>
          Confirmer le mot de passe<Required />
        </label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          aria-required
          aria-invalid={!!confirmPassword && !match}
          aria-describedby="confirm-password-hint"
          {...confirmProps}
        />
        {confirmPassword ? (
          <LiveHint id="confirm-password-hint" state={match ? "valid" : "invalid"}>
            {match ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas"}
          </LiveHint>
        ) : (
          <FieldError message={confirmError} />
        )}
      </div>
    </div>
  );
};

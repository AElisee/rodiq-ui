"use client";

import Link from "next/link";
import { selectCurrentAccount, useAuthHydrated, useAuthStore } from "@/lib/stores/auth-store";

const REDIRECT = encodeURIComponent("/reservation/mes-reservations");

// Rappel de la session en haut de l'historique
export const AccountBanner = () => {
  const hydrated = useAuthHydrated();
  const account = useAuthStore(selectCurrentAccount);
  const signOut = useAuthStore((s) => s.signOut);

  if (!hydrated) return <div className="h-14" aria-hidden />;

  return (
    <p className="mb-12 text-center font-sans text-sm text-taupe">
      {account ? (
        <>
          Connectée en tant que{" "}
          <span className="text-cocoa">
            {account.firstName} {account.lastName}
          </span>{" "}
          ·{" "}
          <button type="button" onClick={signOut} className="text-cocoa underline underline-offset-4">
            Se déconnecter
          </button>
        </>
      ) : (
        <>
          <Link href={`/connexion?redirect=${REDIRECT}`} className="text-cocoa underline underline-offset-4">
            Connectez-vous
          </Link>{" "}
          ou{" "}
          <Link href={`/inscription?redirect=${REDIRECT}`} className="text-cocoa underline underline-offset-4">
            créez un compte
          </Link>{" "}
          pour retrouver vos réservations sur tous vos appareils.
        </>
      )}
    </p>
  );
};

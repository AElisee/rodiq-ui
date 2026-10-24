"use client";

import Link from "next/link";
import { selectCurrentAccount, useAuthHydrated, useAuthStore } from "@/lib/stores/auth-store";

type AccountBannerProps = {
  // Page où revenir après connexion ou inscription
  redirect: string;
  // Fin de l'invitation : « pour retrouver vos … sur tous vos appareils »
  subject: string;
};

// Rappel de la session en haut d'un historique (réservations, commandes)
export const AccountBanner = ({ redirect, subject }: AccountBannerProps) => {
  const hydrated = useAuthHydrated();
  const account = useAuthStore(selectCurrentAccount);
  const signOut = useAuthStore((s) => s.signOut);
  const target = encodeURIComponent(redirect);

  if (!hydrated) return <div className="h-14" aria-hidden />;

  return (
    <p className="mb-12 text-center font-sans text-sm text-taupe">
      {account ? (
        <>
          Session de{" "}
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
          <Link href={`/connexion?redirect=${target}`} className="text-cocoa underline underline-offset-4">
            Connectez-vous
          </Link>{" "}
          ou{" "}
          <Link href={`/inscription?redirect=${target}`} className="text-cocoa underline underline-offset-4">
            créez un compte
          </Link>{" "}
          pour retrouver vos {subject} sur tous vos appareils.
        </>
      )}
    </p>
  );
};

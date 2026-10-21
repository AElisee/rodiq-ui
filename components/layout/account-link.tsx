"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { selectCurrentAccount, useAuthHydrated, useAuthStore } from "@/lib/stores/auth-store";

// Accès au compte : connexion si déconnectée, sinon ses réservations
export const AccountLink = () => {
  const hydrated = useAuthHydrated();
  const account = useAuthStore(selectCurrentAccount);
  const signedIn = hydrated && !!account;

  return (
    <Link
      href={signedIn ? "/reservation/mes-reservations" : "/connexion"}
      aria-label={signedIn ? `Mon compte, ${account.firstName}` : "Se connecter"}
      className="flex items-center gap-1.5 text-base font-semibold transition-opacity hover:opacity-75"
    >
      <UserRound className="size-6" strokeWidth={1.5} />
      {signedIn && <span className="hidden xl:inline">{account.firstName}</span>}
    </Link>
  );
};

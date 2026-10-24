"use client";

import Link from "next/link";
import { CalendarDays, LogOut, ShoppingBag, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { selectCurrentAccount, useAuthHydrated, useAuthStore } from "@/lib/stores/auth-store";

const iconClassName = "flex items-center gap-2 text-base font-semibold transition-opacity hover:opacity-75";
const avatarClassName = "size-9 after:border-transparent";
const fallbackClassName = "bg-sand font-sans text-sm font-semibold text-cocoa";
const itemClassName = "cursor-pointer gap-3 px-3 py-2.5 text-base text-cocoa focus:bg-sand";

// Déconnexion avec confirmation (menu du compte et menu mobile)
export const useSignOut = () => {
  const signOut = useAuthStore((s) => s.signOut);
  return () => {
    signOut();
    toast.success("Vous êtes déconnectée", { description: "À très bientôt chez RODIQ" });
  };
};

// Accès au compte : connexion si déconnectée, sinon menu (réservations, commandes, déconnexion)
export const AccountLink = () => {
  const hydrated = useAuthHydrated();
  const account = useAuthStore(selectCurrentAccount);
  const signOut = useSignOut();

  if (!hydrated || !account) {
    return (
      <Link href="/connexion" aria-label="Se connecter" className={iconClassName}>
        <Avatar className={avatarClassName}>
          <AvatarFallback className={fallbackClassName}>
            <UserRound className="size-5" strokeWidth={1.5} />
          </AvatarFallback>
        </Avatar>
      </Link>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger aria-label={`Mon compte, ${account.firstName}`} className={iconClassName}>
        <Avatar className={avatarClassName}>
          <AvatarFallback className={fallbackClassName}>
            {account.firstName.charAt(0)}
            {account.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-60 bg-pearl p-2 font-sans text-cocoa">
        <DropdownMenuLabel className="px-3 py-2">
          <span className="block font-serif text-lg">
            {account.firstName} {account.lastName}
          </span>
          <span className="block truncate text-sm font-normal text-taupe">{account.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-sand" />
        <DropdownMenuItem asChild className={itemClassName}>
          <Link href="/reservation/mes-reservations">
            <CalendarDays className="size-4" strokeWidth={1.75} />
            Mes réservations
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={itemClassName}>
          <Link href="/commande/mes-commandes">
            <ShoppingBag className="size-4" strokeWidth={1.75} />
            Mes commandes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut} className={itemClassName}>
          <LogOut className="size-4" strokeWidth={1.75} />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

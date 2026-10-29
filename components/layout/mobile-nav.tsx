"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSignOut } from "@/components/layout/account-link";
import { isNavActive, mainNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { selectCurrentAccount, useAuthHydrated, useAuthStore } from "@/lib/stores/auth-store";

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const hydrated = useAuthHydrated();
  const account = useAuthStore(selectCurrentAccount);
  const signOut = useSignOut();
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Ouvrir le menu"
        className="flex h-10 w-10 flex-col items-center justify-center gap-2"
      >
        <span className="h-px w-8 bg-current" />
        <span className="h-px w-8 bg-current" />
        <span className="h-px w-8 bg-current" />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto bg-pearl px-8 pt-24 pb-10 font-serif data-[side=right]:sm:max-w-sm"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Navigation principale du site Rodiq
        </SheetDescription>
        <nav className="flex flex-col gap-4">
          {mainNav.map((link) => {
            const active = isNavActive(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mx-4 rounded-full px-4 py-1 text-3xl text-cocoa transition-colors",
                  active && "bg-sand"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/reservation"
          onClick={close}
          className="mt-10 inline-flex h-14 items-center justify-center whitespace-nowrap rounded-full bg-blush px-6 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Prendre rendez-vous
        </Link>

        {/* Compte : en bas du menu, une fois la session relue */}
        {hydrated && (
          <div className="mt-auto border-t border-sand pt-8">
            {account ? (
              <>
                <p className="text-2xl text-cocoa">Bonjour {account.firstName}</p>
                <Link
                  href="/reservation/mes-reservations"
                  onClick={close}
                  className="mt-3 block font-sans text-base text-cocoa underline-offset-4 hover:underline"
                >
                  Mes réservations
                </Link>
                <Link
                  href="/commande/mes-commandes"
                  onClick={close}
                  className="mt-2 block font-sans text-base text-cocoa underline-offset-4 hover:underline"
                >
                  Mes commandes
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    close();
                  }}
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blush px-6 font-sans text-base text-cocoa transition-colors hover:bg-sand"
                >
                  <LogOut className="size-4" strokeWidth={1.75} />
                  Se déconnecter
                </button>
              </>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/connexion"
                  onClick={close}
                  className="inline-flex h-12 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-blush px-5 font-sans text-base text-cocoa transition-colors hover:bg-sand"
                >
                  Se connecter
                </Link>
                <Link
                  href="/inscription"
                  onClick={close}
                  className="inline-flex h-12 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-blush px-5 font-sans text-base text-cocoa transition-colors hover:bg-sand"
                >
                  S&apos;inscrire
                </Link>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

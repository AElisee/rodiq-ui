"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBag,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAdminHydrated, useAdminStore } from "@/lib/stores/admin-store";
import { useReservationStore, useReservationsHydrated } from "@/lib/stores/reservation-store";
import { cn } from "@/lib/utils";

type AdminNavLink = { label: string; href: string; icon: LucideIcon };

const adminNav: AdminNavLink[] = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { label: "Réservations", href: "/admin/reservations", icon: CalendarCheck },
  { label: "Clientes", href: "/admin/utilisateurs", icon: UsersRound },
  { label: "Prestations", href: "/admin/prestations", icon: Sparkles },
  { label: "Boutique", href: "/admin/boutique", icon: ShoppingBag },
  { label: "Réglages", href: "/admin/reglages", icon: Settings },
];

const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => {
  const pathname = usePathname();
  useReservationsHydrated();
  const pending = useReservationStore((s) => s.reservations.filter((r) => r.status === "en_attente").length);

  return (
    <ul className="flex flex-col gap-1">
      {adminNav.map(({ label, href, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 font-sans text-sm text-cocoa transition-colors hover:bg-sand",
                active && "bg-sand",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              {href === "/admin/reservations" && pending > 0 && (
                <span className="rounded-full bg-cocoa px-2 py-0.5 text-xs text-pearl">
                  {pending}
                  <span className="sr-only"> en attente</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

const SidebarFooter = ({ email, onSignOut }: { email: string; onSignOut: () => void }) => (
  <div className="flex flex-col gap-1 border-t border-sand pt-4 font-sans text-sm text-cocoa">
    <p className="truncate px-4 pb-2 text-xs text-taupe">{email}</p>
    <Link
      href="/"
      target="_blank"
      className="flex items-center gap-3 rounded-full px-4 py-2.5 transition-colors hover:bg-sand"
    >
      <ExternalLink className="size-4" strokeWidth={1.75} />
      Voir le site
    </Link>
    <button
      type="button"
      onClick={onSignOut}
      className="flex items-center gap-3 rounded-full px-4 py-2.5 text-left transition-colors hover:bg-sand"
    >
      <LogOut className="size-4" strokeWidth={1.75} />
      Se déconnecter
    </button>
  </div>
);

const Brand = () => (
  <Link href="/admin" className="block px-4">
    <span className="block font-serif text-4xl leading-none text-cocoa">Rodiq</span>
    <span className="mt-1 block font-sans text-[0.65rem] tracking-[0.3em] text-taupe uppercase">
      Administration
    </span>
  </Link>
);

// Cadre de l'espace admin : menu latéral (tiroir sur mobile) et redirection si non connecté
export const AdminShell = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAdminHydrated();
  const email = useAdminStore((s) => s.email);
  const signOut = useAdminStore((s) => s.signOut);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !email) router.replace(`/admin/connexion?redirect=${encodeURIComponent(pathname)}`);
  }, [hydrated, email, pathname, router]);

  // Page rendue mais masquée tant que la session n'est pas vérifiée (navigation instantanée)
  if (!hydrated || !email) {
    return (
      <div className="min-h-svh bg-pearl" aria-hidden>
        <div hidden>{children}</div>
      </div>
    );
  }

  const handleSignOut = () => {
    signOut();
    toast.success("Vous êtes déconnecté(e)");
  };

  return (
    <div className="flex min-h-svh flex-1 bg-pearl">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-10 border-r border-sand px-3 py-8 lg:flex">
        <Brand />
        <nav aria-label="Menu de l'administration" className="flex-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <SidebarFooter email={email} onSignOut={handleSignOut} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre du haut sur mobile et tablette */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-sand bg-pearl px-4 py-3 lg:hidden">
          <Link href="/admin" className="font-serif text-3xl leading-none text-cocoa">
            Rodiq <span className="font-sans text-xs tracking-[0.2em] text-taupe uppercase">admin</span>
          </Link>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              aria-label="Ouvrir le menu"
              className="flex size-10 flex-col items-center justify-center gap-1.5 text-cocoa"
            >
              <span className="h-px w-6 bg-current" />
              <span className="h-px w-6 bg-current" />
              <span className="h-px w-6 bg-current" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-8 bg-pearl px-3 py-8">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Navigation de l&apos;administration</SheetDescription>
              <Brand />
              <nav aria-label="Menu de l'administration" className="flex-1 overflow-y-auto">
                <NavLinks onNavigate={() => setMenuOpen(false)} />
              </nav>
              <SidebarFooter email={email} onSignOut={handleSignOut} />
            </SheetContent>
          </Sheet>
        </div>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
};

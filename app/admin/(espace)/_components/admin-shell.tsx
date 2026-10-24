"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeft,
  Settings,
  ShoppingBag,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BrandIcon, BrandMark } from "@/components/brand/logo";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminHydrated, useAdminStore } from "@/lib/stores/admin-store";
import { useOrderStore, useOrdersHydrated } from "@/lib/stores/order-store";
import { useReservationStore, useReservationsHydrated } from "@/lib/stores/reservation-store";
import { cn } from "@/lib/utils";

type AdminSubLink = { label: string; href: string };

// Une section avec sous-menus ouvre/ferme ses sous-menus (menu déplié) ou mène au premier (menu replié)
type AdminNavLink = { label: string; href: string; icon: LucideIcon; children?: AdminSubLink[] };

const adminNav: AdminNavLink[] = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { label: "Réservations", href: "/admin/reservations", icon: CalendarCheck },
  { label: "Commandes", href: "/admin/commandes", icon: Package },
  { label: "Clientèle", href: "/admin/utilisateurs", icon: UsersRound },
  { label: "Prestations", href: "/admin/prestations", icon: Sparkles },
  {
    label: "Boutique",
    href: "/admin/boutique",
    icon: ShoppingBag,
    children: [
      { label: "Produits", href: "/admin/boutique/produits" },
      { label: "Catégories", href: "/admin/boutique/categories" },
    ],
  },
  { label: "Réglages", href: "/admin/reglages", icon: Settings },
];

const isActive = (href: string, pathname: string) =>
  href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

// Pastille d'un lien du menu : nombre (menu déplié) ou simple point (menu replié)
const PendingBadge = ({ count, label, dot = false }: { count: number; label: string; dot?: boolean }) => {
  if (count <= 0) return null;
  return dot ? (
    <span className="absolute top-1.5 right-2.5 size-2 rounded-full bg-cocoa">
      <span className="sr-only">
        {count} {label}
      </span>
    </span>
  ) : (
    <span className="rounded-full bg-cocoa px-2 py-0.5 text-xs text-pearl">
      {count}
      <span className="sr-only"> {label}</span>
    </span>
  );
};

// Libellé affiché au survol quand le menu est replié
const CollapsedTooltip = ({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: ReactNode;
}) =>
  collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="font-sans">
        {label}
      </TooltipContent>
    </Tooltip>
  ) : (
    children
  );

const NavLinks = ({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) => {
  const pathname = usePathname();
  useReservationsHydrated();
  useOrdersHydrated();
  // Demandes à traiter, affichées en pastille dans le menu
  const pendingReservations = useReservationStore(
    (s) => s.reservations.filter((r) => r.status === "en_attente").length,
  );
  const pendingOrders = useOrderStore((s) => s.orders.filter((o) => o.status === "en_attente").length);
  const pendingByHref: Record<string, number> = {
    "/admin/reservations": pendingReservations,
    "/admin/commandes": pendingOrders,
  };
  // Sections à sous-menus ouvertes ou fermées par l'utilisateur ; ouvertes par défaut si actives
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  return (
    <ul className="flex flex-col gap-1">
      {adminNav.map(({ label, href, icon: Icon, children }) => {
        const active = isActive(href, pathname);
        // Section à sous-menus : mène au premier sous-menu quand le menu est replié
        const target = children?.[0].href ?? href;
        const pending = pendingByHref[href] ?? 0;
        const isToggle = !!children && !collapsed;
        const open = openSections[href] ?? active;
        const showSubLinks = isToggle && open;
        const itemClass = cn(
          "relative flex w-full items-center gap-3 rounded-full py-2.5 font-sans text-sm text-cocoa transition-colors hover:bg-sand",
          collapsed ? "justify-center px-0" : "px-4",
          active && !showSubLinks && "bg-sand",
        );
        return (
          <li key={href}>
            {isToggle ? (
              <button
                type="button"
                onClick={() => setOpenSections((s) => ({ ...s, [href]: !open }))}
                aria-expanded={open}
                className={cn(itemClass, "text-left")}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                <span className="flex-1">{label}</span>
                {open ? (
                  <ChevronsDownUp className="size-4 shrink-0" strokeWidth={1.75} />
                ) : (
                  <ChevronsUpDown className="size-4 shrink-0" strokeWidth={1.75} />
                )}
              </button>
            ) : (
              <CollapsedTooltip label={label} collapsed={collapsed}>
                <Link
                  href={target}
                  onClick={onNavigate}
                  aria-current={active && !children ? "page" : undefined}
                  className={itemClass}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                  <span className={cn("flex-1", collapsed && "sr-only")}>{label}</span>
                  <PendingBadge count={pending} label="en attente" dot={collapsed} />
                </Link>
              </CollapsedTooltip>
            )}
            {showSubLinks && (
              <ul className="mt-1 ml-6 flex flex-col gap-1 border-l border-sand pl-3">
                {children.map((child) => {
                  const childActive = isActive(child.href, pathname);
                  return (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={onNavigate}
                        aria-current={childActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-full px-4 py-2 font-sans text-sm text-cocoa transition-colors hover:bg-sand",
                          childActive && "bg-sand",
                        )}
                      >
                        <span className="flex-1">{child.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
};

type SidebarFooterProps = {
  email: string;
  onSignOut: () => void;
  collapsed?: boolean;
};

const SidebarFooter = ({ email, onSignOut, collapsed = false }: SidebarFooterProps) => {
  const itemClass = cn(
    "flex items-center gap-3 rounded-full py-2.5 transition-colors hover:bg-sand",
    collapsed ? "justify-center px-0" : "px-4",
  );
  return (
    <div className="flex flex-col gap-1 border-t border-sand pt-4 font-sans text-sm text-cocoa">
      {!collapsed && <p className="truncate px-4 pb-2 text-xs text-taupe">{email}</p>}
      <CollapsedTooltip label="Voir le site" collapsed={collapsed}>
        <Link href="/" target="_blank" className={itemClass}>
          <ExternalLink className="size-4 shrink-0" strokeWidth={1.75} />
          <span className={cn(collapsed && "sr-only")}>Voir le site</span>
        </Link>
      </CollapsedTooltip>
      <CollapsedTooltip label="Se déconnecter" collapsed={collapsed}>
        <button type="button" onClick={onSignOut} className={cn(itemClass, "text-left")}>
          <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
          <span className={cn(collapsed && "sr-only")}>Se déconnecter</span>
        </button>
      </CollapsedTooltip>
    </div>
  );
};

const Brand = ({ collapsed = false }: { collapsed?: boolean }) =>
  collapsed ? (
    <CollapsedTooltip label="Tableau de bord" collapsed>
      <Link href="/admin" className="block text-center text-4xl text-cocoa">
        <BrandIcon />
      </Link>
    </CollapsedTooltip>
  ) : (
    <Link href="/admin" className="block px-4">
      <BrandMark className="block text-4xl text-cocoa" imageClassName="h-10 md:h-10" />
      <span className="mt-1 block font-sans text-[0.65rem] tracking-[0.3em] text-taupe uppercase">Administration</span>
    </Link>
  );

// Contenu du menu latéral : en-tête, séparateur, navigation, pied
const SidebarContent = ({
  email,
  onSignOut,
  onNavigate,
  collapsed = false,
}: SidebarFooterProps & { onNavigate?: () => void }) => (
  <>
    <Brand collapsed={collapsed} />
    <Separator className="my-6 bg-sand" />
    <nav aria-label="Menu de l'administration" className="flex-1 overflow-y-auto">
      <NavLinks onNavigate={onNavigate} collapsed={collapsed} />
    </nav>
    <SidebarFooter email={email} onSignOut={onSignOut} collapsed={collapsed} />
  </>
);

// Fil d'Ariane construit à partir du menu : section, sous-menu éventuel, puis « Détail »
const AdminBreadcrumb = () => {
  const pathname = usePathname();
  const [home, ...sections] = adminNav;
  const section = sections.find(({ href }) => isActive(href, pathname));
  const subLink = section?.children?.find(({ href }) => isActive(href, pathname));
  const current = subLink ?? section;
  // Page de détail sous une section (/admin/commandes/[id], /admin/boutique/produits/[id]…)
  const isDetail = !!current && pathname !== current.href;

  const crumbs: AdminSubLink[] = [
    home,
    ...(section ? [{ label: section.label, href: section.children?.[0].href ?? section.href }] : []),
    ...(subLink ? [subLink] : []),
    ...(isDetail ? [{ label: "Détail", href: pathname }] : []),
  ];

  return (
    <nav aria-label="Fil d'Ariane" className="min-w-0 font-sans text-sm">
      <ol className="flex items-center gap-1.5 text-taupe">
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.label}>
            {index > 0 && (
              <li aria-hidden>
                <ChevronRight className="size-3.5" strokeWidth={1.75} />
              </li>
            )}
            <li className="truncate">
              {index === crumbs.length - 1 ? (
                <span aria-current="page" className="text-cocoa">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="transition-colors hover:text-cocoa">
                  {crumb.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
};

// Cadre de l'espace admin : menu latéral repliable (tiroir sur mobile), barre du haut et redirection si non connecté
export const AdminShell = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAdminHydrated();
  const email = useAdminStore((s) => s.email);
  const signOut = useAdminStore((s) => s.signOut);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  // Desktop : replie/déplie le menu ; mobile et tablette : ouvre le tiroir
  const toggleSidebar = () => {
    if (window.matchMedia("(min-width: 64rem)").matches) setCollapsed((c) => !c);
    else setMenuOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-svh flex-1 bg-pearl">
        <aside
          className={cn(
            "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sand py-8 transition-[width] duration-200 lg:flex",
            collapsed ? "w-16 px-2" : "w-64 px-3",
          )}
        >
          <SidebarContent email={email} onSignOut={handleSignOut} collapsed={collapsed} />
        </aside>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-72 gap-0 bg-pearl px-3 py-8">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Navigation de l&apos;administration</SheetDescription>
            <SidebarContent email={email} onSignOut={handleSignOut} onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-sand bg-pearl px-4 md:px-8">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
              className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-full text-cocoa transition-colors hover:bg-sand"
            >
              <PanelLeft className="size-4" strokeWidth={1.75} />
            </button>
            <Separator orientation="vertical" className="h-4! self-center! bg-sand" />
            <AdminBreadcrumb />
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8 md:py-10">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
};

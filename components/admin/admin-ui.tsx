import type { ComponentProps, ReactNode } from "react";
import { statusMeta, type ReservationStatus } from "@/lib/reservations";
import { cn } from "@/lib/utils";

// Styles partagés de l'espace admin. Les boutons y sont chocolat (et non rose poudré
// comme sur le site) pour distinguer l'outil de gestion du site public.

export const adminButtonClassName =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-cocoa px-5 font-sans text-sm text-pearl transition-colors hover:bg-taupe disabled:cursor-not-allowed disabled:bg-sand disabled:text-taupe";

export const adminOutlineButtonClassName =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-cocoa px-5 font-sans text-sm text-cocoa transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:border-sand disabled:text-taupe";

export const adminSmallButtonClassName =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-cocoa px-3.5 font-sans text-xs text-pearl transition-colors hover:bg-taupe";

export const adminSmallOutlineButtonClassName =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-cocoa px-3.5 font-sans text-xs text-cocoa transition-colors hover:bg-sand";

export const adminInputClassName =
  "h-10 w-full rounded-full border border-sand bg-pearl px-4 font-sans text-sm text-cocoa outline-none transition-colors placeholder:text-taupe focus-visible:border-taupe aria-invalid:border-destructive disabled:text-taupe";

export const adminTextareaClassName =
  "w-full rounded-[var(--radius)] border border-sand bg-pearl px-4 py-3 font-sans text-sm text-cocoa outline-none transition-colors placeholder:text-taupe focus-visible:border-taupe aria-invalid:border-destructive";

export const adminLabelClassName = "mb-1.5 block font-sans text-sm text-cocoa";

// Puce de filtre (statut, période…)
export const chipClassName = (active: boolean) =>
  cn(
    "rounded-full border border-sand px-4 py-1.5 font-sans text-sm text-cocoa transition-colors hover:bg-sand",
    active && "border-cocoa bg-sand",
  );

export const AdminPageHeader = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) => (
  <header className="flex flex-col gap-4 border-b border-sand pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="font-serif text-[clamp(1.75rem,2.6vw,2.5rem)] leading-tight text-cocoa">{title}</h1>
      {description && <p className="mt-1 font-sans text-sm text-taupe">{description}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
  </header>
);

export const AdminPanel = ({ className, ...props }: ComponentProps<"section">) => (
  <section className={cn("rounded-[var(--radius)] border border-sand bg-pearl p-5 md:p-6", className)} {...props} />
);

export const AdminPanelTitle = ({ className, ...props }: ComponentProps<"h2">) => (
  <h2 className={cn("font-serif text-xl text-cocoa", className)} {...props} />
);

export const StatusBadge = ({ status }: { status: ReservationStatus }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-3 py-0.5 font-sans text-xs whitespace-nowrap",
      statusMeta[status].badgeClassName,
    )}
  >
    {statusMeta[status].label}
  </span>
);

// Pagination simple (précédent / suivant)
export const AdminPager = ({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) =>
  pageCount > 1 ? (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-4 font-sans text-sm text-cocoa">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className={adminSmallOutlineButtonClassName + " disabled:pointer-events-none disabled:border-sand disabled:text-taupe"}
      >
        Précédent
      </button>
      <span>
        Page {page} sur {pageCount}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount}
        className={adminSmallOutlineButtonClassName + " disabled:pointer-events-none disabled:border-sand disabled:text-taupe"}
      >
        Suivant
      </button>
    </nav>
  ) : null;

// Recherche insensible à la casse et aux accents
export const normalizeSearch = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

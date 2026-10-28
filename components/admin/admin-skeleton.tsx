import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Squelettes de l'admin : la forme de l'écran s'affiche pendant la lecture des données

// Annonce le chargement aux lecteurs d'écran
const Loading = ({ label }: { label: string }) => <span className="sr-only">{label}</span>;

// En-tête de page (titre et description)
const HeaderSkeleton = () => (
  <div className="flex flex-col gap-2 border-b border-sand pb-6">
    <Skeleton className="h-9 w-56 rounded-full" />
    <Skeleton className="h-4 w-80 max-w-full rounded-full" />
  </div>
);

// Tableau : en-tête puis lignes à deux niveaux (texte principal, texte secondaire)
export const AdminTableSkeleton = ({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) => (
  <div role="status" className="rounded-[var(--radius)] border border-sand bg-pearl">
    <Loading label="Chargement des données…" />
    <div className="flex gap-6 border-b border-sand px-4 py-3">
      {Array.from({ length: columns }, (_, column) => (
        <Skeleton key={column} className="h-3 flex-1 rounded-full" />
      ))}
    </div>
    {Array.from({ length: rows }, (_, row) => (
      <div key={row} className="flex gap-6 border-b border-sand px-4 py-4 last:border-b-0">
        {Array.from({ length: columns }, (_, column) => (
          <div key={column} className="flex flex-1 flex-col gap-2">
            <Skeleton className={cn("h-3.5 rounded-full", column % 2 === 0 ? "w-4/5" : "w-3/5")} />
            <Skeleton className="h-3 w-2/5 rounded-full" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

// Écran de liste : en-tête, recherche et filtres, tableau
export const AdminListSkeleton = ({ filters = 3, columns }: { filters?: number; columns?: number }) => (
  <div role="status" className="flex flex-col gap-6" aria-busy>
    <Loading label="Chargement de la liste…" />
    <HeaderSkeleton />
    <div className="flex flex-col gap-3 xl:flex-row xl:justify-between">
      <Skeleton className="h-10 w-full rounded-full xl:max-w-sm" />
      <div className="grid gap-3 sm:grid-cols-3 xl:flex">
        {Array.from({ length: filters }, (_, index) => (
          <Skeleton key={index} className="h-10 rounded-full xl:w-48" />
        ))}
      </div>
    </div>
    <AdminTableSkeleton columns={columns} />
  </div>
);

// Panneau : titre puis quelques lignes
const PanelSkeleton = ({ lines = 4, className }: { lines?: number; className?: string }) => (
  <div className={cn("flex flex-col gap-4 rounded-[var(--radius)] border border-sand bg-pearl p-5 md:p-6", className)}>
    <Skeleton className="h-6 w-40 rounded-full" />
    {Array.from({ length: lines }, (_, index) => (
      <div key={index} className="flex justify-between gap-6">
        <Skeleton className="h-3.5 w-1/4 rounded-full" />
        <Skeleton className="h-3.5 w-1/3 rounded-full" />
      </div>
    ))}
  </div>
);

// Écran fait de panneaux (édition, réglages)
export const AdminPanelsSkeleton = ({ panels = 3 }: { panels?: number }) => (
  <div role="status" className="flex flex-col gap-6" aria-busy>
    <Loading label="Chargement des données…" />
    <HeaderSkeleton />
    {Array.from({ length: panels }, (_, index) => (
      <PanelSkeleton key={index} lines={index === 0 ? 5 : 3} />
    ))}
  </div>
);

// Fiche de détail : lien de retour, titre, panneaux principal et latéral
export const AdminDetailSkeleton = () => (
  <div role="status" className="flex flex-col gap-6 pt-6" aria-busy>
    <Loading label="Chargement de la fiche…" />
    <Skeleton className="h-4 w-28 rounded-full" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-64 max-w-full rounded-full" />
      <Skeleton className="h-4 w-48 rounded-full" />
    </div>
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-6">
        <PanelSkeleton lines={5} />
        <PanelSkeleton lines={3} />
      </div>
      <PanelSkeleton lines={4} className="h-fit" />
    </div>
  </div>
);

// Indicateurs (tuiles chiffrées)
// `className` remplace la grille par défaut (celle de l'écran Commandes)
export const AdminStatsSkeleton = ({
  count = 4,
  className = "grid-cols-2 gap-3 lg:grid-cols-4",
}: {
  count?: number;
  className?: string;
}) => (
  <div className={cn("grid", className)} aria-hidden>
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="flex flex-col gap-3 rounded-[var(--radius)] border border-sand bg-pearl p-5">
        <Skeleton className="h-3.5 w-2/3 rounded-full" />
        <Skeleton className="h-8 w-1/2 rounded-full" />
        <Skeleton className="h-3 w-3/4 rounded-full" />
      </div>
    ))}
  </div>
);

// Liste simple (historique d'un compte…) : lignes séparées par un filet
export const AdminLinesSkeleton = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div role="status" className={cn("flex flex-col divide-y divide-sand border-t border-sand", className)}>
    <Loading label="Chargement…" />
    {Array.from({ length: lines }, (_, index) => (
      <div key={index} className="flex items-center justify-between gap-4 py-3">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-1/2 rounded-full" />
          <Skeleton className="h-3 w-1/3 rounded-full" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

// Tableau de bord : indicateurs puis graphique et listes
export const AdminDashboardSkeleton = () => (
  <div role="status" className="flex flex-col gap-8" aria-busy>
    <Loading label="Chargement du tableau de bord…" />
    <HeaderSkeleton />
    <AdminStatsSkeleton count={5} className="gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" />
    <div className="rounded-[var(--radius)] border border-sand bg-pearl p-5 md:p-6">
      <Skeleton className="h-6 w-48 rounded-full" />
      <Skeleton className="mt-6 h-64 w-full" />
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <PanelSkeleton lines={5} />
      <PanelSkeleton lines={5} />
    </div>
  </div>
);

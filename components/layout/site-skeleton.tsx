import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Squelettes du site public : la forme de la page s'affiche pendant la lecture des données

// Annonce le chargement aux lecteurs d'écran
const Loading = ({ label }: { label: string }) => <span className="sr-only">{label}</span>;

const range = (length: number) => Array.from({ length }, (_, index) => index);

// Grille de la boutique : photo, nom, prix, bouton
export const ProductGridSkeleton = ({ count = 8, className }: { count?: number; className?: string }) => (
  <div role="status" className={className}>
    <Loading label="Chargement des produits…" />
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-y-14" aria-hidden>
      {range(count).map((index) => (
        <li key={index} className="flex flex-col">
          <Skeleton className="aspect-[4/5] w-full rounded-[var(--radius)]" />
          <Skeleton className="mt-4 h-5 w-3/4 rounded-full" />
          <Skeleton className="mt-2 mb-4 h-4 w-1/3 rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
        </li>
      ))}
    </ul>
  </div>
);

// Fiche produit : galerie puis nom, prix, description et bouton
export const ProductDetailSkeleton = () => (
  <div role="status">
    <Loading label="Chargement du produit…" />
    <Skeleton className="h-4 w-48 rounded-full" />
    <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-12 lg:gap-20" aria-hidden>
      <Skeleton className="aspect-[4/5] w-full rounded-[var(--radius)]" />
      <div className="flex flex-col md:py-4">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="mt-4 h-11 w-4/5 rounded-full" />
        <Skeleton className="mt-5 h-6 w-32 rounded-full" />
        <div className="mt-8 flex flex-col gap-3 border-t border-sand pt-8">
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-11/12 rounded-full" />
          <Skeleton className="h-4 w-2/3 rounded-full" />
        </div>
        <Skeleton className="mt-10 h-14 w-full rounded-full" />
      </div>
    </div>
  </div>
);

// Historique (réservations, commandes) : filtres puis cartes
export const HistorySkeleton = ({ filters = 4, cards = 3 }: { filters?: number; cards?: number }) => (
  <div role="status">
    <Loading label="Chargement de l'historique…" />
    <div className="flex flex-wrap justify-center gap-3" aria-hidden>
      {range(filters).map((index) => (
        <Skeleton key={index} className="h-9 w-28 rounded-full" />
      ))}
    </div>
    <ul className="mt-12 flex flex-col gap-6" aria-hidden>
      {range(cards).map((index) => (
        <li key={index} className="rounded-[var(--radius)] border border-sand p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-1/2 rounded-full" />
              <Skeleton className="h-4 w-1/3 rounded-full" />
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-sand pt-6">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-2/5 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-1/3 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

// Parcours en deux colonnes (panier, réservation, commande) : contenu à gauche, récapitulatif à droite
export const FlowSkeleton = ({
  blocks = 3,
  className = "lg:grid-cols-[1fr_360px]",
}: {
  blocks?: number;
  className?: string;
}) => (
  <div role="status" className={cn("grid gap-12 lg:items-start lg:gap-16", className)}>
    <Loading label="Chargement…" />
    <div className="flex flex-col gap-10" aria-hidden>
      {range(blocks).map((index) => (
        <div key={index} className="flex flex-col gap-4">
          <Skeleton className="h-7 w-48 rounded-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-12 rounded-full" />
            <Skeleton className="h-12 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      ))}
    </div>
    <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-sand p-6 md:p-8" aria-hidden>
      <Skeleton className="h-6 w-40 rounded-full" />
      {range(3).map((index) => (
        <div key={index} className="flex justify-between gap-4">
          <Skeleton className="h-4 w-1/2 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      ))}
      <Skeleton className="mt-4 h-14 w-full rounded-full" />
    </div>
  </div>
);

// Carte des prestations : catégories, puis titres et lignes de prestations
export const CarteSkeleton = () => (
  <div role="status">
    <Loading label="Chargement de la carte…" />
    <div className="mt-10 flex flex-wrap justify-center gap-3" aria-hidden>
      {range(4).map((index) => (
        <Skeleton key={index} className="h-9 w-28 rounded-full" />
      ))}
    </div>
    <div className="mt-16 flex flex-col gap-20 md:mt-20" aria-hidden>
      {range(2).map((section) => (
        <div key={section}>
          <div className="flex flex-col gap-3 border-b border-sand pb-6">
            <Skeleton className="h-10 w-64 max-w-full rounded-full" />
            <Skeleton className="h-5 w-80 max-w-full rounded-full" />
          </div>
          <div className="divide-y divide-sand">
            {range(3).map((line) => (
              <div key={line} className="flex items-center justify-between gap-8 py-6">
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-1/2 rounded-full" />
                  <Skeleton className="h-4 w-1/3 rounded-full" />
                </div>
                <Skeleton className="h-10 w-28 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Formulaire (connexion, inscription) : champs puis bouton
export const FormSkeleton = ({ fields = 2 }: { fields?: number }) => (
  <div role="status" className="flex flex-col gap-6">
    <Loading label="Chargement…" />
    {range(fields).map((index) => (
      <div key={index} className="flex flex-col gap-2" aria-hidden>
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    ))}
    <Skeleton className="mt-3 h-14 w-full rounded-full" aria-hidden />
  </div>
);

// Ligne de texte centrée (rappel de session…)
export const LineSkeleton = ({ className }: { className?: string }) => (
  <div role="status" className={cn("flex justify-center", className)}>
    <Loading label="Chargement…" />
    <Skeleton className="h-4 w-72 max-w-full rounded-full" aria-hidden />
  </div>
);

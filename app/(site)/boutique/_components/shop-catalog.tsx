"use client";

import { Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ShopQuery, ShopSort } from "@/lib/api/boutique";
import { useShopCategories, useShopCategoriesLoaded, useShopStore } from "@/lib/stores/shop-store";
import { cn } from "@/lib/utils";
import { Pagination } from "./pagination";
import { ProductCard } from "./product-card";

const PAGE_SIZE = 24;

const sortOptions: { value: ShopSort; label: string }[] = [
  { value: "defaut", label: "Pertinence" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
];

// Filtres (catégorie, recherche, tri par prix) et grille des produits : filtrage, tri et pagination
// faits par l'API
export const ShopCatalog = () => {
  // Catégorie choisie depuis une fiche produit (/boutique?categorie=…)
  const [selectedCategoryId, setCategoryId] = useState<string | null>(useSearchParams().get("categorie"));
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ShopSort>("defaut");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const catalogRef = useRef<HTMLDivElement>(null);
  const categoriesLoaded = useShopCategoriesLoaded();
  // Catégories ayant au moins un produit visible, dans l'ordre choisi dans l'admin
  const categories = useShopCategories();
  const categoriesError = useShopStore((s) => s.categoriesError);
  const result = useShopStore((s) => s.page);
  const pageError = useShopStore((s) => s.pageError);
  const loadPage = useShopStore((s) => s.loadPage);

  // Ignore une catégorie inconnue ou sans produit visible (lien ?categorie=… périmé), une fois la liste lue
  const categoryId =
    !categoriesLoaded || categoriesError || categories.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : null;

  const filters: ShopQuery = { categoryId, search: deferredQuery, sort, page, pageSize: PAGE_SIZE };
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    if (categoriesLoaded) void loadPage(JSON.parse(filtersKey) as ShopQuery);
  }, [categoriesLoaded, filtersKey, loadPage]);

  // Tout changement de filtre ou de tri ramène à la première page
  const changeCategory = (id: string | null) => {
    setCategoryId(id);
    setPage(1);
  };
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const changeSort = (value: ShopSort) => {
    setSort(value);
    setPage(1);
  };

  const changePage = (next: number) => {
    setPage(next);
    catalogRef.current?.scrollIntoView({ block: "start" });
  };

  const hasFilters = categoryId !== null || query !== "";
  const resetFilters = () => {
    changeCategory(null);
    changeQuery("");
  };

  const total = result?.total ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const visible = result?.products ?? [];

  const categoryButtons = [{ id: null, name: "Tout" }, ...categories];

  return (
    <div ref={catalogRef} className="mt-10 scroll-mt-32 md:mt-12">
      {/* Catégories */}
      <div role="group" aria-label="Catégories de produits" className="flex flex-wrap justify-center gap-3">
        {categoryButtons.map((category) => (
          <button
            key={category.id ?? "all"}
            type="button"
            onClick={() => changeCategory(category.id)}
            aria-pressed={categoryId === category.id}
            className={cn(
              "rounded-full border border-sand px-5 py-2 font-sans text-sm text-cocoa transition-colors hover:bg-sand",
              categoryId === category.id && "bg-sand",
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Recherche et tri */}
      <div className="mt-10 flex flex-col gap-4 border-b border-sand pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-taupe"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder="Rechercher un produit"
            aria-label="Rechercher un produit"
            className="h-11 w-full rounded-full border border-sand bg-pearl pr-11 pl-11 font-sans text-base text-cocoa outline-none transition-colors placeholder:text-taupe focus-visible:border-taupe [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => changeQuery("")}
              aria-label="Effacer la recherche"
              className="absolute top-1/2 right-4 -translate-y-1/2 text-taupe transition-colors hover:text-cocoa"
            >
              <X className="size-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <p className="font-sans text-sm text-taupe" aria-live="polite">
            {result && `${total} produit${total > 1 ? "s" : ""}`}
          </p>
          <Select value={sort} onValueChange={(value) => changeSort(value as ShopSort)}>
            <SelectTrigger
              aria-label="Trier les produits"
              className="h-12 min-w-48 justify-between rounded-full border-sand px-6 font-sans text-base text-cocoa data-[size=default]:h-12 [&>svg]:size-5"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end" className="bg-pearl font-sans text-cocoa [&_[data-slot=select-item]]:py-2 [&_[data-slot=select-item]]:text-base">
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {pageError ? (
        <div role="alert" className="flex flex-col items-center py-20 text-center">
          <p className="font-serif text-[clamp(1.1rem,1.5vw,1.35rem)] text-cocoa">
            Les produits n&apos;ont pas pu être chargés.
          </p>
          <p className="mt-3 max-w-md font-sans text-sm text-taupe">{pageError}</p>
          <button
            type="button"
            onClick={() => void loadPage(filters)}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-blush px-6 font-sans text-base text-cocoa transition-colors hover:bg-sand"
          >
            Réessayer
          </button>
        </div>
      ) : !result ? (
        <div className="mt-10 min-h-96" aria-hidden />
      ) : visible.length > 0 ? (
        <>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-y-14">
            {visible.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>

          <Pagination page={result.page} pageCount={pageCount} onPageChange={changePage} />
        </>
      ) : (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="font-serif text-[clamp(1.1rem,1.5vw,1.35rem)] text-cocoa">
            {hasFilters ? "Aucun produit ne correspond à votre recherche." : "Aucun produit n'est proposé pour le moment."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-blush px-6 font-sans text-base text-cocoa transition-colors hover:bg-sand"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}
    </div>
  );
};

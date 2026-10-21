"use client";

import { Search, X } from "lucide-react";
import { useDeferredValue, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productCategories, products } from "@/lib/produits";
import { cn } from "@/lib/utils";
import { Pagination } from "./pagination";
import { ProductCard } from "./product-card";

const PAGE_SIZE = 24;

type SortOrder = "default" | "price-asc" | "price-desc";

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "default", label: "Pertinence" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
];

// Recherche insensible à la casse et aux accents (« elixir » trouve « Élixir »)
const normalize = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

// Filtres (catégorie, recherche, tri par prix) et grille des produits
export const ShopCatalog = () => {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("default");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const catalogRef = useRef<HTMLDivElement>(null);

  const search = normalize(deferredQuery);
  const filtered = products
    .filter((p) => !categoryId || p.categoryId === categoryId)
    .filter((p) => !search || normalize(p.name).includes(search))
    .toSorted((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      return 0;
    });

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Tout changement de filtre ou de tri ramène à la première page
  const changeCategory = (id: string | null) => {
    setCategoryId(id);
    setPage(1);
  };
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const changeSort = (value: SortOrder) => {
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

  const categoryButtons = [{ id: null, name: "Tout" }, ...productCategories];

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
            {filtered.length} produit{filtered.length > 1 && "s"}
          </p>
          <Select value={sort} onValueChange={(value) => changeSort(value as SortOrder)}>
            <SelectTrigger
              aria-label="Trier les produits"
              className="h-11 rounded-full border-sand px-5 font-sans text-sm text-cocoa data-[size=default]:h-11"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end" className="bg-pearl font-sans text-cocoa">
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length > 0 ? (
        <>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-y-14">
            {visible.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>

          <Pagination page={currentPage} pageCount={pageCount} onPageChange={changePage} />
        </>
      ) : (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="font-serif text-[clamp(1.1rem,1.5vw,1.35rem)] text-cocoa">
            Aucun produit ne correspond à votre recherche.
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

"use client";

import { Eye, Pencil, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ADMIN_PAGE_SIZE,
  AdminPageHeader,
  AdminPager,
  AdminSelect,
  StockBadge,
  adminButtonClassName,
  adminInputClassName,
} from "@/components/admin/admin-ui";
import { AdminListSkeleton, AdminTableSkeleton } from "@/components/admin/admin-skeleton";
import { AdminExportButtons } from "@/components/admin/admin-export";
import { ProductVisual } from "@/components/shop/product-visual";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage } from "@/lib/api/client";
import type { AdminProductsQuery, AdminProductsSort } from "@/lib/api/boutique";
import { formatPrice } from "@/lib/prestations";
import { getDiscountPercent, type AdminProduct, type StockLevel } from "@/lib/produits";
import {
  useAdminBoutiqueStore,
  useAdminCategories,
  useAdminCategoriesLoaded,
  useBoutiqueSummary,
} from "@/lib/stores/admin-boutique-store";
import { useAllOrdersLoaded } from "@/lib/stores/admin-orders-store";
import { cn } from "@/lib/utils";
import { DeleteProduct, iconButtonClassName } from "./product-actions";
import { ProductCreateSheet, useSoldCounts, type SoldCounts } from "./product-form";

const sortOptions: { value: AdminProductsSort; label: string }[] = [
  { value: "defaut", label: "Ordre du catalogue" },
  { value: "nom", label: "Nom" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
  { value: "stock", label: "Stock restant" },
  { value: "recent", label: "Ajoutés récemment" },
];

const levelOptions: { value: StockLevel | "tous"; label: string }[] = [
  { value: "tous", label: "Tous les stocks" },
  { value: "faible", label: "Stock faible" },
  { value: "epuise", label: "Épuisés" },
  { value: "ok", label: "Stock suffisant" },
];

type Visibility = AdminProductsQuery["visibility"];

const visibilityOptions: { value: NonNullable<Visibility> | "tous"; label: string }[] = [
  { value: "tous", label: "Visibles et masqués" },
  { value: "visibles", label: "Visibles en boutique" },
  { value: "masques", label: "Masqués" },
];

const exportHeaders = [
  "Produit",
  "Déclinaison",
  "Catégorie",
  "Prix (FCFA)",
  "Prix d'origine (FCFA)",
  "Remise",
  "Reste",
  "Seuil d'alerte",
  "Vendus",
  "Visible",
];

const exportRows = (product: AdminProduct, categoryName: string, sold: SoldCounts) => {
  const discount = getDiscountPercent(product);
  const common = [
    categoryName,
    product.price,
    discount !== null ? product.compareAtPrice! : "",
    discount !== null ? `-${discount}%` : "",
  ];
  const entries = product.variants.length
    ? product.variants.map((v) => ({ name: v.name, stock: v.stock, key: `${product.id}:${v.id}` }))
    : [{ name: "", stock: product.stock, key: `${product.id}:` }];
  return entries.map((entry) => [
    product.name,
    entry.name,
    ...common,
    entry.stock,
    product.lowStockThreshold,
    sold.get(entry.key) ?? 0,
    product.hidden ? "Non" : "Oui",
  ]);
};

// Produits de la boutique : ajout, prix, promotions, déclinaisons, stock et visibilité. Filtres,
// recherche, tri et pagination faits par l'API
export const ProductsEditor = () => {
  const ordersHydrated = useAllOrdersLoaded();
  const categoriesLoaded = useAdminCategoriesLoaded();
  const categories = useAdminCategories();
  const page = useAdminBoutiqueStore((s) => s.page);
  const pageError = useAdminBoutiqueStore((s) => s.pageError);
  const loading = useAdminBoutiqueStore((s) => s.query !== s.pageQuery);
  const loadPage = useAdminBoutiqueStore((s) => s.loadPage);
  const fetchMatching = useAdminBoutiqueStore((s) => s.fetchMatching);
  const setHidden = useAdminBoutiqueStore((s) => s.setHidden);
  useBoutiqueSummary();
  const summary = useAdminBoutiqueStore((s) => s.summary);
  const searchParams = useSearchParams();
  const initialLevel = searchParams.get("stock");
  const [selectedCategoryId, setCategoryId] = useState<string | null>(searchParams.get("categorie"));
  const [level, setLevel] = useState<StockLevel | null>(
    levelOptions.some((o) => o.value === initialLevel && o.value !== "tous") ? (initialLevel as StockLevel) : null,
  );
  const [visibility, setVisibility] = useState<Visibility>(null);
  const [sort, setSort] = useState<AdminProductsSort>("defaut");
  const [query, setQuery] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  // Produits dont la visibilité est en cours d'enregistrement
  const [toggling, setToggling] = useState<string[]>([]);
  const search = useDeferredValue(query);
  const sold = useSoldCounts();

  // Ignore une catégorie inconnue ou supprimée (lien ?categorie=… périmé), une fois la liste lue
  const categoryId =
    !categoriesLoaded || categories.length === 0 || categories.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : null;
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  const filters: AdminProductsQuery = {
    categoryId,
    search,
    level,
    visibility,
    sort,
    page: pageNumber,
    pageSize: ADMIN_PAGE_SIZE,
  };
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    if (categoriesLoaded) void loadPage(JSON.parse(filtersKey) as AdminProductsQuery);
  }, [categoriesLoaded, filtersKey, loadPage]);

  if (!ordersHydrated || (!page && !pageError)) return <AdminListSkeleton filters={4} columns={6} />;

  const pageCount = page ? Math.ceil(page.total / ADMIN_PAGE_SIZE) : 0;
  const currentPage = page?.page ?? pageNumber;
  const visible = page?.products ?? [];

  const resetPage =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPageNumber(1);
    };

  const toggleHidden = async (product: AdminProduct) => {
    setToggling((ids) => [...ids, product.id]);
    try {
      await setHidden(product, !product.hidden);
    } catch (error) {
      toast.error(
        product.hidden ? `« ${product.name} » n'a pas été remis en boutique` : `« ${product.name} » n'a pas été masqué`,
        { description: errorMessage(error) },
      );
    } finally {
      setToggling((ids) => ids.filter((id) => id !== product.id));
    }
  };

  const loadExport = async () => ({
    title: "Catalogue produits",
    filename: "produits",
    headers: exportHeaders,
    rows: (await fetchMatching({ categoryId, search, level, visibility, sort })).flatMap((p) =>
      exportRows(p, categoryNames.get(p.categoryId) ?? "", sold),
    ),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Catalogue produits"
        description={
          summary
            ? `${summary.total} produit${summary.total > 1 ? "s" : ""} · ${summary.toRestock} à réapprovisionner · ${summary.hidden} masqué${summary.hidden > 1 ? "s" : ""}`
            : undefined
        }
      >
        <AdminExportButtons count={page?.total ?? 0} load={loadExport} />
        <ProductCreateSheet
          sold={sold}
          trigger={
            <button type="button" className={adminButtonClassName}>
              <Plus className="size-4" strokeWidth={1.75} />
              Ajouter un produit
            </button>
          }
        />
      </AdminPageHeader>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-taupe" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            placeholder="Rechercher un produit"
            aria-label="Rechercher un produit"
            className={`${adminInputClassName} pl-10`}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-4">
          <AdminSelect
            label="Catégories"
            value={categoryId ?? "all"}
            onValueChange={(v) => resetPage(setCategoryId)(v === "all" ? null : v)}
            options={[{ value: "all", label: "Toutes les catégories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            className="xl:w-48"
          />
          <AdminSelect
            label="Stock"
            value={level ?? "tous"}
            onValueChange={(v) => resetPage(setLevel)(v === "tous" ? null : (v as StockLevel))}
            options={levelOptions}
            className="xl:w-44"
          />
          <AdminSelect
            label="Visibilité"
            value={visibility ?? "tous"}
            onValueChange={(v) => resetPage(setVisibility)(v === "tous" ? null : (v as Visibility))}
            options={visibilityOptions}
            className="xl:w-48"
          />
          <AdminSelect
            label="Trier par"
            value={sort}
            onValueChange={resetPage(setSort)}
            options={sortOptions}
            className="xl:w-48"
          />
        </div>
      </div>

      {loading ? (
        <AdminTableSkeleton columns={6} />
      ) : pageError ? (
        <div role="alert" className="rounded-[var(--radius)] border border-sand p-6 font-sans text-sm text-cocoa">
          <p className="font-serif text-lg">Les produits n&apos;ont pas pu être chargés.</p>
          <p className="mt-2 text-taupe">{pageError}</p>
          <button type="button" onClick={() => void loadPage(filters)} className="mt-4 underline underline-offset-4">
            Réessayer
          </button>
        </div>
      ) : visible.length > 0 ? (
        <>
          <div className="rounded-[var(--radius)] border border-sand">
            <Table className="font-sans text-cocoa">
              <TableHeader>
                <TableRow className="border-sand hover:bg-transparent">
                  <TableHead className="w-12 px-4 text-right text-taupe">#</TableHead>
                  <TableHead className="px-4 text-taupe">Produit</TableHead>
                  <TableHead className="px-4 text-taupe">Catégorie</TableHead>
                  <TableHead className="px-4 text-right text-taupe">Prix</TableHead>
                  <TableHead className="px-4 text-taupe">Reste en stock</TableHead>
                  <TableHead className="px-4 text-center text-taupe">Visible</TableHead>
                  <TableHead className="px-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((product, index) => {
                  const discount = getDiscountPercent(product);
                  const href = `/admin/boutique/produits/${encodeURIComponent(product.id)}`;
                  return (
                    <TableRow key={product.id} className="border-sand hover:bg-transparent">
                      <TableCell className="px-4 py-3 text-right align-middle text-taupe tabular-nums">
                        {(currentPage - 1) * ADMIN_PAGE_SIZE + index + 1}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="relative aspect-[4/5] w-10 shrink-0 overflow-hidden rounded-md bg-sand">
                            <ProductVisual product={product} sizes="40px" iconClassName="size-4" />
                          </div>
                          <Link
                            href={href}
                            className={cn("min-w-0 underline-offset-4 hover:underline", product.hidden && "text-taupe line-through")}
                          >
                            {product.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-middle">
                        {categoryNames.has(product.categoryId) ? (
                          <button
                            type="button"
                            onClick={() => resetPage(setCategoryId)(product.categoryId)}
                            title="Afficher les produits de cette catégorie"
                            className="text-sm whitespace-nowrap underline-offset-4 hover:underline"
                          >
                            {categoryNames.get(product.categoryId)}
                          </button>
                        ) : (
                          <span className="text-xs text-taupe">{product.categoryId}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right align-middle whitespace-nowrap">
                        <p>{formatPrice(product.price)}</p>
                        {discount !== null && (
                          <p className="text-xs text-taupe">
                            <s>{formatPrice(product.compareAtPrice!)}</s> · -{discount}%
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="tabular-nums">{product.totalStock}</span>
                          <StockBadge level={product.level} />
                        </div>
                        {product.variants.length > 0 && (
                          <ul className="mt-1 flex max-w-64 flex-wrap gap-x-3 text-xs text-taupe">
                            {product.variants.map((v) => (
                              <li key={v.id} className={cn(v.level !== "ok" && "text-cocoa")}>
                                {v.name} : {v.stock}
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={!product.hidden}
                          disabled={toggling.includes(product.id)}
                          onChange={() => void toggleHidden(product)}
                          aria-label={`${product.name} visible en boutique`}
                          className="size-4 accent-cocoa"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={href} aria-label={`Voir ${product.name}`} title="Voir la fiche" className={iconButtonClassName}>
                            <Eye className="size-4" strokeWidth={1.75} />
                          </Link>
                          <Link
                            href={`${href}/modifier`}
                            aria-label={`Modifier ${product.name}`}
                            title="Modifier"
                            className={iconButtonClassName}
                          >
                            <Pencil className="size-4" strokeWidth={1.75} />
                          </Link>
                          <DeleteProduct product={product} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <AdminPager page={currentPage} pageCount={pageCount} onPageChange={setPageNumber} />
        </>
      ) : (
        <p className="text-center font-serif text-lg text-cocoa">
          {summary?.total === 0
            ? "Aucun produit pour le moment : ajoutez le premier."
            : "Aucun produit ne correspond à votre recherche."}
        </p>
      )}
    </div>
  );
};

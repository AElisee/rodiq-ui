"use client";

import { Eye, Pencil, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import {
  ADMIN_PAGE_SIZE,
  AdminPageHeader,
  AdminPager,
  AdminSelect,
  StockBadge,
  adminButtonClassName,
  adminInputClassName,
  normalizeSearch,
} from "@/components/admin/admin-ui";
import { AdminExportButtons, type ExportTable } from "@/components/admin/admin-export";
import { ProductVisual } from "@/components/shop/product-visual";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/prestations";
import {
  getDiscountPercent,
  productLevel,
  productStock,
  stockLevel,
} from "@/lib/produits";
import {
  useCatalogHydrated,
  useCatalogProducts,
  useCatalogStore,
  useProductCategories,
  useProductCategoryNames,
  type CatalogProduct,
} from "@/lib/stores/catalog-store";
import { useOrdersHydrated } from "@/lib/stores/order-store";
import { cn } from "@/lib/utils";
import { ProductRowActions, iconButtonClassName } from "./product-actions";
import { ProductCreateSheet, useSoldCounts } from "./product-form";

type SortOrder = "catalogue" | "nom" | "prix-asc" | "prix-desc" | "stock";

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "catalogue", label: "Ordre du catalogue" },
  { value: "nom", label: "Nom" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
  { value: "stock", label: "Stock restant" },
];

// « alerte » : épuisés et stocks faibles
type StockFilter = "tous" | "alerte" | "epuise";

const stockFilterOptions: { value: StockFilter; label: string }[] = [
  { value: "tous", label: "Tous les stocks" },
  { value: "alerte", label: "À réapprovisionner" },
  { value: "epuise", label: "Épuisés" },
];

// Produits de la boutique : ajout, prix, promotions, déclinaisons, stock et visibilité
export const ProductsEditor = () => {
  const hydrated = useCatalogHydrated();
  const ordersHydrated = useOrdersHydrated();
  const products = useCatalogProducts();
  const saveProduct = useCatalogStore((s) => s.saveProduct);
  const categories = useProductCategories();
  const categoryNames = useProductCategoryNames();
  const searchParams = useSearchParams();
  const initialStock = searchParams.get("stock");
  const [selectedCategoryId, setCategoryId] = useState<string | null>(searchParams.get("categorie"));
  const [stockFilter, setStockFilter] = useState<StockFilter>(
    stockFilterOptions.some((o) => o.value === initialStock) ? (initialStock as StockFilter) : "tous",
  );
  const [sort, setSort] = useState<SortOrder>("catalogue");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const search = normalizeSearch(useDeferredValue(query));

  const sold = useSoldCounts();

  if (!hydrated || !ordersHydrated) return <div className="min-h-96" aria-hidden />;

  // Ignore une catégorie inconnue ou supprimée (lien ?categorie=… périmé)
  const categoryId = categories.some((c) => c.id === selectedCategoryId) ? selectedCategoryId : null;

  const filtered = products
    .filter((p) => !categoryId || p.categoryId === categoryId)
    .filter((p) => !search || normalizeSearch(p.name).includes(search))
    .filter((p) => {
      if (stockFilter === "tous") return true;
      const level = productLevel(p);
      return stockFilter === "epuise" ? level === "epuise" : level !== "ok";
    })
    .toSorted((a, b) => {
      if (sort === "nom") return a.name.localeCompare(b.name, "fr");
      if (sort === "prix-asc") return a.price - b.price;
      if (sort === "prix-desc") return b.price - a.price;
      if (sort === "stock") return productStock(a) - productStock(b);
      return 0;
    });

  const pageCount = Math.ceil(filtered.length / ADMIN_PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const visible = filtered.slice((currentPage - 1) * ADMIN_PAGE_SIZE, currentPage * ADMIN_PAGE_SIZE);

  const toggleHidden = (product: CatalogProduct) => saveProduct({ ...product, hidden: !product.hidden });

  const alertCount = products.filter((p) => productLevel(p) !== "ok").length;
  const hiddenCount = products.filter((p) => p.hidden).length;

  const exportTable: ExportTable = {
    title: "Produits",
    filename: "produits",
    headers: [
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
    ],
    rows: filtered.flatMap((p) => {
      const discount = getDiscountPercent(p);
      const common = [
        categoryNames.get(p.categoryId) ?? "",
        p.price,
        discount !== null ? p.compareAtPrice! : "",
        discount !== null ? `-${discount}%` : "",
      ];
      const entries = p.variants?.length
        ? p.variants.map((v) => ({ name: v.name, stock: v.stock, key: `${p.id}:${v.id}` }))
        : [{ name: "", stock: productStock(p), key: `${p.id}:` }];
      return entries.map((entry) => [
        p.name,
        entry.name,
        ...common,
        entry.stock,
        p.lowStockThreshold ?? "",
        sold.get(entry.key) ?? 0,
        p.hidden ? "Non" : "Oui",
      ]);
    }),
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Produits"
        description={`${products.length} produits · ${alertCount} à réapprovisionner · ${hiddenCount} masqué${hiddenCount > 1 ? "s" : ""}`}
      >
        <AdminExportButtons table={exportTable} />
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
        <div className="relative w-full xl:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-taupe" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un produit"
            aria-label="Rechercher un produit"
            className={`${adminInputClassName} pl-10`}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:w-auto">
          <AdminSelect
            label="Catégories"
            value={categoryId ?? "all"}
            onValueChange={(v) => {
              setCategoryId(v === "all" ? null : v);
              setPage(1);
            }}
            options={[{ value: "all", label: "Toutes les catégories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            className="xl:w-52"
          />
          <AdminSelect
            label="Stock"
            value={stockFilter}
            onValueChange={(v) => {
              setStockFilter(v);
              setPage(1);
            }}
            options={stockFilterOptions}
            className="xl:w-52"
          />
          <AdminSelect
            label="Trier par"
            value={sort}
            onValueChange={(v) => {
              setSort(v);
              setPage(1);
            }}
            options={sortOptions}
            className="xl:w-52"
          />
        </div>
      </div>

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
              const stock = productStock(product);
              const threshold = product.lowStockThreshold;
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
                      <div className="min-w-0">
                        <Link
                          href={href}
                          className={cn("underline-offset-4 hover:underline", product.hidden && "text-taupe line-through")}
                        >
                          {product.name}
                        </Link>
                        {product.custom && <p className="text-xs text-taupe">Ajouté depuis l&apos;admin</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle">
                    {categoryNames.has(product.categoryId) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryId(product.categoryId);
                          setPage(1);
                        }}
                        title="Afficher les produits de cette catégorie"
                        className="text-sm whitespace-nowrap underline-offset-4 hover:underline"
                      >
                        {categoryNames.get(product.categoryId)}
                      </button>
                    ) : (
                      <span className="text-xs text-taupe">Sans catégorie</span>
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
                      <span className="tabular-nums">{stock}</span>
                      <StockBadge level={productLevel(product)} />
                    </div>
                    {product.variants?.length ? (
                      <ul className="mt-1 flex max-w-64 flex-wrap gap-x-3 text-xs text-taupe">
                        {product.variants.map((v) => (
                          <li
                            key={v.id}
                            className={cn(stockLevel(v.stock, threshold) !== "ok" && "text-cocoa")}
                          >
                            {v.name} : {v.stock}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={!product.hidden}
                      onChange={() => toggleHidden(product)}
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
                      <ProductRowActions product={product} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <AdminPager page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      {filtered.length === 0 && (
        <p className="text-center font-serif text-lg text-cocoa">Aucun produit ne correspond à votre recherche.</p>
      )}
    </div>
  );
};

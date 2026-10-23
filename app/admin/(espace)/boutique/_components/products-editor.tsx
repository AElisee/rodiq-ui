"use client";

import { Pencil, RotateCcw, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import {
  AdminPageHeader,
  adminButtonClassName,
  adminInputClassName,
  adminLabelClassName,
  adminTextareaClassName,
  chipClassName,
  normalizeSearch,
} from "@/components/admin/admin-ui";
import { FieldError } from "@/components/forms/form-fields";
import { ProductVisual } from "@/components/shop/product-visual";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/prestations";
import { getDiscountPercent, productCategories, type Product } from "@/lib/produits";
import { toOverride, useCatalogHydrated, useCatalogProducts, useCatalogStore } from "@/lib/stores/catalog-store";

type CatalogProduct = Product & { hidden?: boolean };

const categoryNames = new Map(productCategories.map((c) => [c.id, c.name]));

// Modification d'un produit : nom, prix, promotion, description, disponibilité
const ProductForm = ({ product }: { product: CatalogProduct }) => {
  const saveProduct = useCatalogStore((s) => s.saveProduct);
  const initial = toOverride(product);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name);
  const [price, setPrice] = useState(String(initial.price));
  const [compareAtPrice, setCompareAtPrice] = useState(initial.compareAtPrice ? String(initial.compareAtPrice) : "");
  const [description, setDescription] = useState(initial.description);
  const [soldOut, setSoldOut] = useState(initial.soldOut);
  const [hidden, setHidden] = useState(initial.hidden);
  const [submitted, setSubmitted] = useState(false);

  const priceValue = Number(price);
  const compareValue = Number(compareAtPrice);
  const nameError = name.trim().length < 2 ? "Indiquez le nom du produit" : undefined;
  const priceError = !price || !Number.isInteger(priceValue) || priceValue <= 0 ? "Indiquez un prix en FCFA" : undefined;
  const compareError =
    compareAtPrice && (!Number.isInteger(compareValue) || compareValue <= priceValue)
      ? "Le prix d'origine doit être supérieur au prix de vente"
      : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (nameError || priceError || compareError) return;

    saveProduct(product.id, {
      name: name.trim(),
      price: priceValue,
      compareAtPrice: compareAtPrice ? compareValue : null,
      description: description.trim(),
      soldOut,
      hidden,
    });
    setOpen(false);
    toast.success("Produit enregistré", { description: name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Modifier ${product.name}`}
          className="inline-flex size-8 items-center justify-center rounded-full text-taupe transition-colors hover:bg-sand hover:text-cocoa"
        >
          <Pencil className="size-4" strokeWidth={1.75} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] gap-0 overflow-y-auto rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-lg md:p-8">
        <DialogTitle className="font-serif text-xl leading-tight font-normal">Modifier le produit</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-taupe">
          {categoryNames.get(product.categoryId)} · les photos sont gérées par l&apos;équipe technique.
        </DialogDescription>

        <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="product-name" className={adminLabelClassName}>
              Nom *
            </label>
            <input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={submitted && !!nameError}
              className={adminInputClassName}
            />
            {submitted && <FieldError message={nameError} />}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="product-price" className={adminLabelClassName}>
                Prix de vente (FCFA) *
              </label>
              <input
                id="product-price"
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={submitted && !!priceError}
                className={adminInputClassName}
              />
              {submitted && <FieldError message={priceError} />}
            </div>
            <div>
              <label htmlFor="product-compare" className={adminLabelClassName}>
                Prix d&apos;origine <span className="text-taupe">(promotion)</span>
              </label>
              <input
                id="product-compare"
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="Aucune promotion"
                aria-invalid={submitted && !!compareError}
                className={adminInputClassName}
              />
              {submitted && <FieldError message={compareError} />}
            </div>
          </div>
          <div>
            <label htmlFor="product-description" className={adminLabelClassName}>
              Description <span className="text-taupe">(sinon, texte de la catégorie)</span>
            </label>
            <textarea
              id="product-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={adminTextareaClassName}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} className="size-4 accent-cocoa" />
            Épuisé
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="size-4 accent-cocoa" />
            Masquer de la boutique
          </label>

          <div className="mt-4 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <button type="button" className="text-sm underline-offset-4 hover:underline">
                Annuler
              </button>
            </DialogClose>
            <button type="submit" className={`w-full sm:w-auto ${adminButtonClassName}`}>
              Enregistrer
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Produits de la boutique : prix, promotions, stock et visibilité
export const ProductsEditor = () => {
  const hydrated = useCatalogHydrated();
  const products = useCatalogProducts();
  const overrides = useCatalogStore((s) => s.productOverrides);
  const saveProduct = useCatalogStore((s) => s.saveProduct);
  const resetProduct = useCatalogStore((s) => s.resetProduct);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const search = normalizeSearch(useDeferredValue(query));

  if (!hydrated) return <div className="min-h-96" aria-hidden />;

  const filtered = products
    .filter((p) => !categoryId || p.categoryId === categoryId)
    .filter((p) => !search || normalizeSearch(p.name).includes(search));

  const toggle = (product: CatalogProduct, field: "soldOut" | "hidden") => {
    saveProduct(product.id, { ...toOverride(product), [field]: !product[field] });
  };

  const soldOutCount = products.filter((p) => p.soldOut).length;
  const hiddenCount = products.filter((p) => p.hidden).length;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Boutique"
        description={`${products.length} produits · ${soldOutCount} épuisé${soldOutCount > 1 ? "s" : ""} · ${hiddenCount} masqué${hiddenCount > 1 ? "s" : ""}`}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-taupe" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit"
            aria-label="Rechercher un produit"
            className={`${adminInputClassName} pl-10`}
          />
        </div>
        <div role="group" aria-label="Catégories" className="flex flex-wrap gap-2">
          {[{ id: null, name: "Tout" }, ...productCategories].map((c) => (
            <button
              key={c.id ?? "all"}
              type="button"
              onClick={() => setCategoryId(c.id)}
              aria-pressed={categoryId === c.id}
              className={chipClassName(categoryId === c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-sand">
        <Table className="font-sans text-cocoa">
          <TableHeader>
            <TableRow className="border-sand hover:bg-transparent">
              <TableHead className="px-4 text-taupe">Produit</TableHead>
              <TableHead className="px-4 text-right text-taupe">Prix</TableHead>
              <TableHead className="px-4 text-center text-taupe">Épuisé</TableHead>
              <TableHead className="px-4 text-center text-taupe">Visible</TableHead>
              <TableHead className="px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((product) => {
              const discount = getDiscountPercent(product);
              return (
                <TableRow key={product.id} className="border-sand hover:bg-transparent">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative aspect-[4/5] w-10 shrink-0 overflow-hidden rounded-md bg-sand">
                        <ProductVisual product={product} sizes="40px" iconClassName="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={product.hidden ? "text-taupe line-through" : undefined}>{product.name}</p>
                        <p className="text-xs text-taupe">{categoryNames.get(product.categoryId)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                    <p>{formatPrice(product.price)}</p>
                    {discount !== null && (
                      <p className="text-xs text-taupe">
                        <s>{formatPrice(product.compareAtPrice!)}</s> · -{discount}%
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!product.soldOut}
                      onChange={() => toggle(product, "soldOut")}
                      aria-label={`${product.name} épuisé`}
                      className="size-4 accent-cocoa"
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={!product.hidden}
                      onChange={() => toggle(product, "hidden")}
                      aria-label={`${product.name} visible en boutique`}
                      className="size-4 accent-cocoa"
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <ProductForm key={JSON.stringify(overrides[product.id] ?? null)} product={product} />
                      {overrides[product.id] && (
                        <button
                          type="button"
                          onClick={() => {
                            resetProduct(product.id);
                            toast("Produit rétabli", { description: "Valeurs d'origine du catalogue" });
                          }}
                          aria-label={`Rétablir ${product.name}`}
                          title="Rétablir les valeurs d'origine"
                          className="inline-flex size-8 items-center justify-center rounded-full text-taupe transition-colors hover:bg-sand hover:text-cocoa"
                        >
                          <RotateCcw className="size-4" strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {filtered.length === 0 && (
        <p className="text-center font-serif text-lg text-cocoa">Aucun produit ne correspond à votre recherche.</p>
      )}
    </div>
  );
};

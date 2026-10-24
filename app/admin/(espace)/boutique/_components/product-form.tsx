"use client";

import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AdminSelect,
  adminButtonClassName,
  adminInputClassName,
  adminLabelClassName,
  adminSmallOutlineButtonClassName,
  adminTextareaClassName,
} from "@/components/admin/admin-ui";
import { FieldError } from "@/components/forms/form-fields";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { orderLineKey } from "@/lib/commandes";
import { resizeImage } from "@/lib/images";
import {
  CAPACITY_UNITS,
  DEFAULT_LOW_STOCK_THRESHOLD,
  WEIGHT_UNITS,
  type Measure,
  type ProductImage,
} from "@/lib/produits";
import { useCatalogStore, useProductCategories, type CatalogProduct } from "@/lib/stores/catalog-store";
import { useOrderStore } from "@/lib/stores/order-store";

const MAX_PHOTOS = 4;

// Quantités vendues (commandes non annulées) par produit:déclinaison, voir orderLineKey
export type SoldCounts = Map<string, number>;

export const useSoldCounts = () => {
  const orders = useOrderStore((s) => s.orders);
  return useMemo<SoldCounts>(() => {
    const counts: SoldCounts = new Map();
    for (const order of orders) {
      if (order.status === "annulee") continue;
      for (const line of order.lines) {
        const key = orderLineKey(line);
        counts.set(key, (counts.get(key) ?? 0) + line.quantity);
      }
    }
    return counts;
  }, [orders]);
};

type VariantRow = { id: string; name: string; stock: string };

const sectionTitleClassName = "mt-2 border-t border-sand pt-5 font-serif text-lg";

const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const shortId = () => crypto.randomUUID().slice(0, 6);

const isCount = (value: string) => value !== "" && Number.isInteger(Number(value)) && Number(value) >= 0;

// Mesure facultative : vide, ou nombre positif (virgule acceptée)
const parseMeasure = (value: string) => Number(value.replace(",", "."));
const isMeasure = (value: string) => value === "" || (Number.isFinite(parseMeasure(value)) && parseMeasure(value) > 0);
const toMeasure = <Unit extends string>(value: string, unit: Unit): Measure<Unit> | undefined =>
  value ? { value: parseMeasure(value), unit } : undefined;

const NumberInput = ({
  id,
  value,
  onChange,
  invalid,
  step = 1,
  decimal,
  placeholder,
  label,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  step?: number | "any";
  // Nombre à virgule (contenance, poids)
  decimal?: boolean;
  placeholder?: string;
  label?: string;
}) => (
  <input
    id={id}
    type="number"
    inputMode={decimal ? "decimal" : "numeric"}
    min={0}
    step={step}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    aria-label={label}
    aria-invalid={invalid}
    className={adminInputClassName}
  />
);

type ProductFormProps = {
  // Absent : création d'un produit
  product?: CatalogProduct;
  sold: SoldCounts;
  onDone?: () => void;
  // Absent : pas de bouton « Annuler »
  onCancel?: () => void;
};

// Champs du formulaire : à remonter (key) pour repartir du produit à jour
export const ProductFormFields = ({ product, sold, onDone, onCancel }: ProductFormProps) => {
  const saveProduct = useCatalogStore((s) => s.saveProduct);
  const categories = useProductCategories();
  const creating = !product;

  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  // Saisie : prix d'origine puis prix promo ; stockage : price = prix payé, compareAtPrice = prix barré
  const [price, setPrice] = useState(product ? String(product.compareAtPrice ?? product.price) : "");
  const [promoPrice, setPromoPrice] = useState(product?.compareAtPrice ? String(product.price) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [capacity, setCapacity] = useState(product?.capacity ? String(product.capacity.value) : "");
  const [capacityUnit, setCapacityUnit] = useState(product?.capacity?.unit ?? CAPACITY_UNITS[0]);
  const [weight, setWeight] = useState(product?.weight ? String(product.weight.value) : "");
  const [weightUnit, setWeightUnit] = useState(product?.weight?.unit ?? WEIGHT_UNITS[0]);
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [hasVariants, setHasVariants] = useState(!!product?.variants?.length);
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants?.length
      ? product.variants.map((v) => ({ id: v.id, name: v.name, stock: String(v.stock) }))
      : [
          { id: shortId(), name: "", stock: "" },
          { id: shortId(), name: "", stock: "" },
        ],
  );
  const [stock, setStock] = useState(product ? String(product.stock ?? 0) : "");
  const [threshold, setThreshold] = useState(String(product?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD));
  const [hidden, setHidden] = useState(!!product?.hidden);
  const [submitted, setSubmitted] = useState(false);

  const priceValue = Number(price);
  const promoValue = Number(promoPrice);
  const variantNames = variants.map((v) => v.name.trim().toLowerCase());
  const errors = {
    name: name.trim().length < 2 ? "Indiquez le nom du produit" : undefined,
    category: !categories.some((c) => c.id === categoryId) ? "Choisissez une catégorie" : undefined,
    price: !price || !Number.isInteger(priceValue) || priceValue <= 0 ? "Indiquez un prix en FCFA" : undefined,
    promoPrice:
      promoPrice && (!Number.isInteger(promoValue) || promoValue <= 0 || promoValue >= priceValue)
        ? "Le prix promotionnel doit être inférieur au prix d'origine"
        : undefined,
    capacity: !isMeasure(capacity) ? "Indiquez une contenance supérieure à 0" : undefined,
    weight: !isMeasure(weight) ? "Indiquez un poids supérieur à 0" : undefined,
    stock: !hasVariants && !isCount(stock) ? "Indiquez la quantité en stock" : undefined,
    variants:
      hasVariants && variants.length === 0
        ? "Ajoutez au moins un variant"
        : hasVariants && variants.some((v) => !v.name.trim() || !isCount(v.stock))
          ? "Chaque variant a un nom et une quantité en stock"
          : hasVariants && new Set(variantNames).size < variantNames.length
            ? "Deux variants portent le même nom"
            : undefined,
    threshold: !isCount(threshold) ? "Indiquez un seuil (0 pour aucune alerte avant rupture)" : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const soldFor = (variantId?: string) => (product ? (sold.get(`${product.id}:${variantId ?? ""}`) ?? 0) : 0);

  const updateVariant = (id: string, changes: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((row) => (row.id === id ? { ...row, ...changes } : row)));

  const addPhotos = async (files: FileList | null) => {
    const selected = Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));
    const room = MAX_PHOTOS - images.length;
    if (selected.length > room) toast(`${MAX_PHOTOS} photos au maximum par produit`);
    try {
      const added = await Promise.all(selected.slice(0, room).map((file) => resizeImage(file)));
      setImages((current) => [...current, ...added]);
    } catch {
      toast.error("Une photo n'a pas pu être importée");
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;

    const id = product?.id ?? `${slugify(name) || "produit"}-${shortId()}`;
    saveProduct({
      ...product,
      id,
      name: name.trim(),
      categoryId,
      price: promoPrice ? promoValue : priceValue,
      compareAtPrice: promoPrice ? priceValue : undefined,
      description: description.trim() || undefined,
      capacity: toMeasure(capacity, capacityUnit),
      weight: toMeasure(weight, weightUnit),
      images: images.length ? images : undefined,
      variants: hasVariants
        ? variants.map((v) => ({ id: v.id, name: v.name.trim(), stock: Number(v.stock) }))
        : undefined,
      stock: hasVariants ? 0 : Number(stock),
      lowStockThreshold: Number(threshold),
      hidden,
    });
    setSubmitted(false);
    onDone?.();
    toast.success(creating ? "Produit ajouté" : "Produit enregistré", { description: name.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div>
        <label htmlFor="product-name" className={adminLabelClassName}>
          Nom *
        </label>
        <input
          id="product-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={submitted && !!errors.name}
          className={adminInputClassName}
        />
        {submitted && <FieldError message={errors.name} />}
      </div>
      <div>
        <p className={adminLabelClassName}>Catégorie *</p>
        <AdminSelect
          label="Catégorie"
          value={categoryId}
          onValueChange={setCategoryId}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        {categories.length === 0 ? (
          <FieldError message="Créez d'abord une catégorie (Boutique › Catégories)" />
        ) : (
          submitted && <FieldError message={errors.category} />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="product-price" className={adminLabelClassName}>
            Prix d&apos;origine (FCFA) *
          </label>
          <NumberInput
            id="product-price"
            step={500}
            value={price}
            onChange={setPrice}
            invalid={submitted && !!errors.price}
          />
          {submitted && <FieldError message={errors.price} />}
        </div>
        <div>
          <label htmlFor="product-promo" className={adminLabelClassName}>
            Prix promotionnel (FCFA)
          </label>
          <NumberInput
            id="product-promo"
            step={500}
            value={promoPrice}
            onChange={setPromoPrice}
            placeholder="Aucune promotion"
            invalid={submitted && !!errors.promoPrice}
          />
          {submitted && <FieldError message={errors.promoPrice} />}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="product-capacity" className={adminLabelClassName}>
            Contenance
          </label>
          <div className="flex gap-2">
            <NumberInput
              id="product-capacity"
              step="any"
              decimal
              value={capacity}
              onChange={setCapacity}
              placeholder="Ex. 300"
              invalid={submitted && !!errors.capacity}
            />
            <AdminSelect
              label="Unité de contenance"
              value={capacityUnit}
              onValueChange={setCapacityUnit}
              options={CAPACITY_UNITS.map((unit) => ({ value: unit, label: unit }))}
              className="w-24 shrink-0"
            />
          </div>
          {submitted && <FieldError message={errors.capacity} />}
        </div>
        <div>
          <label htmlFor="product-weight" className={adminLabelClassName}>
            Poids
          </label>
          <div className="flex gap-2">
            <NumberInput
              id="product-weight"
              step="any"
              decimal
              value={weight}
              onChange={setWeight}
              placeholder="Ex. 1"
              invalid={submitted && !!errors.weight}
            />
            <AdminSelect
              label="Unité de poids"
              value={weightUnit}
              onValueChange={setWeightUnit}
              options={WEIGHT_UNITS.map((unit) => ({ value: unit, label: unit }))}
              className="w-24 shrink-0"
            />
          </div>
          {submitted && <FieldError message={errors.weight} />}
        </div>
      </div>

      <h3 className={sectionTitleClassName}>Photos</h3>
      <div>
          <ul className="grid grid-cols-4 gap-3">
            {images.map((image, i) => (
              <li key={i} className="relative aspect-[4/5] overflow-hidden rounded-md bg-sand">
                <Image
                  src={image}
                  alt={`Photo ${i + 1}`}
                  fill
                  unoptimized={typeof image === "string"}
                  sizes="120px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImages((current) => current.filter((_, index) => index !== i))}
                  aria-label={`Retirer la photo ${i + 1}`}
                  className="absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-full bg-pearl text-cocoa transition-colors hover:bg-sand"
                >
                  <X className="size-3.5" strokeWidth={1.75} />
                </button>
              </li>
            ))}
            {images.length < MAX_PHOTOS && (
              <li>
                <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-taupe text-xs text-taupe transition-colors hover:bg-sand has-focus-visible:border-cocoa">
                  <ImagePlus className="size-5" strokeWidth={1.5} />
                  Ajouter
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      void addPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </li>
            )}
          </ul>
          <p className="mt-2 text-xs text-taupe">
            {MAX_PHOTOS} photos au maximum ; la première sert de visuel principal.
          </p>
        </div>

      <h3 className={sectionTitleClassName}>Stock</h3>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={hasVariants}
          onChange={(e) => setHasVariants(e.target.checked)}
          className="size-4 accent-cocoa"
        />
        Ce produit a plusieurs variants (teinte, contenance…)
      </label>

      {hasVariants ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[auto_1fr_6rem_2rem] items-center gap-x-3 gap-y-2 text-sm">
            <span />
            <span className="text-taupe">Nom</span>
            <span className="text-taupe">Quantité</span>
            <span />
            {variants.map((v, i) => (
              <div key={v.id} className="contents">
                <span className="text-taupe">Variant {i + 1}</span>
                <input
                  value={v.name}
                  onChange={(e) => updateVariant(v.id, { name: e.target.value })}
                  placeholder={i === 0 ? "Ex. Nude rosé" : undefined}
                  aria-label={`Nom du variant ${i + 1}`}
                  aria-invalid={submitted && !v.name.trim()}
                  className={adminInputClassName}
                />
                <NumberInput
                  value={v.stock}
                  onChange={(value) => updateVariant(v.id, { stock: value })}
                  label={`Quantité en stock du variant ${i + 1}`}
                  invalid={submitted && !isCount(v.stock)}
                />
                <button
                  type="button"
                  onClick={() => setVariants((rows) => rows.filter((row) => row.id !== v.id))}
                  aria-label={`Supprimer le variant ${i + 1}`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-taupe transition-colors hover:bg-sand hover:text-cocoa"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                </button>
                {product && soldFor(v.id) > 0 && (
                  <p className="col-span-3 col-start-2 -mt-1 text-xs text-taupe">{soldFor(v.id)} vendu(s)</p>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setVariants((rows) => [...rows, { id: shortId(), name: "", stock: "" }])}
            className={`self-start ${adminSmallOutlineButtonClassName}`}
          >
            <Plus className="size-3.5" strokeWidth={1.75} />
            Ajouter un variant
          </button>
          {submitted && <FieldError message={errors.variants} />}
        </div>
      ) : (
        <div>
          <label htmlFor="product-stock" className={adminLabelClassName}>
            Quantité en stock *
          </label>
          <NumberInput
            id="product-stock"
            value={stock}
            onChange={setStock}
            invalid={submitted && !!errors.stock}
          />
          {submitted && <FieldError message={errors.stock} />}
        </div>
      )}

      <div>
        <label htmlFor="product-threshold" className={adminLabelClassName}>
          Seuil d&apos;alerte *
        </label>
        <NumberInput
          id="product-threshold"
          value={threshold}
          onChange={setThreshold}
          invalid={submitted && !!errors.threshold}
        />
        <p className="mt-1.5 text-xs text-taupe">
          Alerte « stock faible » quand il reste ce nombre d&apos;articles ou moins
          {hasVariants && " (par variant)"}.
        </p>
        {submitted && <FieldError message={errors.threshold} />}
      </div>

      <label className="mt-2 flex cursor-pointer items-center gap-3 border-t border-sand pt-5 text-sm">
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="size-4 accent-cocoa" />
        Masquer de la boutique
      </label>

      <div className="mt-4 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm underline-offset-4 hover:underline">
            Annuler
          </button>
        )}
        <button type="submit" className={`w-full sm:w-auto ${adminButtonClassName}`}>
          {creating ? "Ajouter le produit" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
};

// Ajout d'un produit dans un tiroir : fiche, photos, déclinaisons, stock et seuil d'alerte
export const ProductCreateSheet = ({ sold, trigger }: { sold: SoldCounts; trigger: ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto bg-pearl p-6 font-sans text-cocoa data-[side=right]:sm:max-w-xl md:p-8">
        <SheetTitle className="font-serif text-xl leading-tight font-normal text-cocoa">Ajouter un produit</SheetTitle>
        <SheetDescription className="mt-1 text-sm text-taupe">
          Le produit apparaît en boutique dès l&apos;enregistrement, sauf s&apos;il est masqué.
        </SheetDescription>
        <div className="mt-6">
          <ProductFormFields sold={sold} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

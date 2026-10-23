"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AdminPageHeader,
  AdminPanel,
  adminButtonClassName,
  adminInputClassName,
  adminLabelClassName,
  adminOutlineButtonClassName,
  adminSmallOutlineButtonClassName,
} from "@/components/admin/admin-ui";
import { FieldError } from "@/components/forms/form-fields";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatPrice, type Prestation, type PrestationCategory } from "@/lib/prestations";
import { useCatalogHydrated, useCatalogStore } from "@/lib/stores/catalog-store";

const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type PrestationFormProps = {
  categories: PrestationCategory[];
  categoryId: string;
  prestation?: Prestation;
  trigger: React.ReactNode;
};

// Ajout ou modification d'une prestation (nom, tarif, catégorie)
const PrestationForm = ({ categories, categoryId: initialCategoryId, prestation, trigger }: PrestationFormProps) => {
  const savePrestation = useCatalogStore((s) => s.savePrestation);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(prestation?.name ?? "");
  const [price, setPrice] = useState(prestation ? String(prestation.price) : "");
  const [fromPrice, setFromPrice] = useState(prestation?.fromPrice ?? false);
  const [note, setNote] = useState(prestation?.note ?? "");
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [submitted, setSubmitted] = useState(false);

  const priceValue = Number(price);
  const nameError = name.trim().length < 2 ? "Indiquez le nom de la prestation" : undefined;
  const priceError = !price || !Number.isInteger(priceValue) || priceValue <= 0 ? "Indiquez un prix en FCFA" : undefined;

  const reset = () => {
    setName(prestation?.name ?? "");
    setPrice(prestation ? String(prestation.price) : "");
    setFromPrice(prestation?.fromPrice ?? false);
    setNote(prestation?.note ?? "");
    setCategoryId(initialCategoryId);
    setSubmitted(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (nameError || priceError) return;

    savePrestation(categoryId, {
      id: prestation?.id ?? `${slugify(name)}-${crypto.randomUUID().slice(0, 4)}`,
      name: name.trim(),
      price: priceValue,
      fromPrice: fromPrice || undefined,
      note: note.trim() || undefined,
    });
    setOpen(false);
    toast.success(prestation ? "Prestation modifiée" : "Prestation ajoutée", { description: name.trim() });
    if (!prestation) reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && prestation) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="gap-0 rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-md md:p-8">
        <DialogTitle className="font-serif text-xl leading-tight font-normal">
          {prestation ? "Modifier la prestation" : "Nouvelle prestation"}
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-taupe">
          Les changements sont visibles immédiatement sur le site.
        </DialogDescription>

        <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="prestation-name" className={adminLabelClassName}>
              Nom *
            </label>
            <input
              id="prestation-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={submitted && !!nameError}
              className={adminInputClassName}
            />
            {submitted && <FieldError message={nameError} />}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prestation-price" className={adminLabelClassName}>
                Prix (FCFA) *
              </label>
              <input
                id="prestation-price"
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
              <label htmlFor="prestation-category" className={adminLabelClassName}>
                Catégorie
              </label>
              <select
                id="prestation-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={adminInputClassName}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={fromPrice}
              onChange={(e) => setFromPrice(e.target.checked)}
              className="size-4 accent-cocoa"
            />
            Prix d&apos;appel (affiché « dès … »)
          </label>
          <div>
            <label htmlFor="prestation-note" className={adminLabelClassName}>
              Précision <span className="text-taupe">(facultatif)</span>
            </label>
            <input
              id="prestation-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mèches incluses, mains et pieds…"
              className={adminInputClassName}
            />
          </div>

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

const DeletePrestation = ({ prestation }: { prestation: Prestation }) => {
  const removePrestation = useCatalogStore((s) => s.removePrestation);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Supprimer ${prestation.name}`}
          className="inline-flex size-8 items-center justify-center rounded-full text-taupe transition-colors hover:bg-sand hover:text-cocoa"
        >
          <Trash2 className="size-4" strokeWidth={1.75} />
        </button>
      </DialogTrigger>
      <DialogContent className="gap-0 rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-md md:p-8">
        <DialogTitle className="font-serif text-xl leading-tight font-normal">Supprimer « {prestation.name} » ?</DialogTitle>
        <DialogDescription className="mt-3 text-sm text-taupe">
          La prestation ne sera plus proposée à la réservation. Les réservations existantes sont conservées.
        </DialogDescription>
        <div className="mt-8 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <button type="button" className="text-sm underline-offset-4 hover:underline">
              Annuler
            </button>
          </DialogClose>
          <DialogClose asChild>
            <button
              type="button"
              onClick={() => {
                removePrestation(prestation.id);
                toast("Prestation supprimée", { description: prestation.name });
              }}
              className={`w-full sm:w-auto ${adminButtonClassName}`}
            >
              Supprimer
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Nom et accroche d'une catégorie, modifiables sur place
const CategoryHeader = ({ category }: { category: PrestationCategory }) => {
  const updateCategory = useCatalogStore((s) => s.updateCategory);
  const [name, setName] = useState(category.name);
  const [tagline, setTagline] = useState(category.tagline);
  const changed = name !== category.name || tagline !== category.tagline;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        updateCategory(category.id, { name: name.trim(), tagline: tagline.trim() });
        toast.success("Catégorie enregistrée", { description: name.trim() });
      }}
      className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
    >
      <div>
        <label htmlFor={`category-name-${category.id}`} className={adminLabelClassName}>
          Catégorie
        </label>
        <input
          id={`category-name-${category.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${adminInputClassName} font-serif text-base`}
        />
      </div>
      <div>
        <label htmlFor={`category-tagline-${category.id}`} className={adminLabelClassName}>
          Accroche
        </label>
        <input
          id={`category-tagline-${category.id}`}
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className={adminInputClassName}
        />
      </div>
      <button type="submit" disabled={!changed || !name.trim()} className={adminOutlineButtonClassName}>
        Enregistrer
      </button>
    </form>
  );
};

// Grille tarifaire affichée sur /prestations et proposée à la réservation
export const PrestationsEditor = () => {
  const hydrated = useCatalogHydrated();
  const categories = useCatalogStore((s) => s.categories);

  if (!hydrated) return <div className="min-h-96" aria-hidden />;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Prestations"
        description="Catégories, prestations et tarifs affichés sur le site et proposés à la réservation."
      />

      {categories.map((category) => (
        <AdminPanel key={category.id} className="flex flex-col gap-5">
          <CategoryHeader key={`${category.name}|${category.tagline}`} category={category} />

          {category.prestations.length > 0 ? (
            <ul className="divide-y divide-sand border-y border-sand font-sans text-sm text-cocoa">
              {category.prestations.map((prestation) => (
                <li key={prestation.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p>{prestation.name}</p>
                    {prestation.note && <p className="text-xs text-taupe">{prestation.note}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="mr-2 whitespace-nowrap">{formatPrice(prestation.price, prestation.fromPrice)}</span>
                    <PrestationForm
                      key={JSON.stringify(prestation)}
                      categories={categories}
                      categoryId={category.id}
                      prestation={prestation}
                      trigger={
                        <button
                          type="button"
                          aria-label={`Modifier ${prestation.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-full text-taupe transition-colors hover:bg-sand hover:text-cocoa"
                        >
                          <Pencil className="size-4" strokeWidth={1.75} />
                        </button>
                      }
                    />
                    <DeletePrestation prestation={prestation} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-y border-sand py-4 font-sans text-sm text-taupe">
              Aucune prestation : la catégorie est masquée sur le site.
            </p>
          )}

          <PrestationForm
            categories={categories}
            categoryId={category.id}
            trigger={
              <button type="button" className={`self-start ${adminSmallOutlineButtonClassName}`}>
                <Plus className="size-3.5" strokeWidth={1.75} />
                Ajouter une prestation
              </button>
            }
          />
        </AdminPanel>
      ))}
    </div>
  );
};

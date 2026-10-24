"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AdminPageHeader,
  adminButtonClassName,
  adminInputClassName,
  adminLabelClassName,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PrestationCategory } from "@/lib/prestations";
import { useCatalogHydrated, useCatalogStore } from "@/lib/stores/catalog-store";
import { iconButtonClassName } from "../../boutique/_components/product-actions";
import { dialogClassName, slugify } from "./prestations-editor";

type CategoryFormProps = {
  // Absente : création d'une catégorie
  category?: PrestationCategory;
  categories: PrestationCategory[];
  trigger: ReactNode;
};

// Ajout ou modification d'une catégorie (nom et accroche affichés sur /prestations)
const CategoryForm = ({ category, categories, trigger }: CategoryFormProps) => {
  const savePrestationCategory = useCatalogStore((s) => s.savePrestationCategory);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name ?? "");
  const [tagline, setTagline] = useState(category?.tagline ?? "");
  const [submitted, setSubmitted] = useState(false);

  const trimmedName = name.trim();
  const duplicate = categories.some(
    (c) => c.id !== category?.id && slugify(c.name) === slugify(trimmedName),
  );
  const nameError =
    trimmedName.length < 2
      ? "Indiquez le nom de la catégorie"
      : duplicate
        ? "Une catégorie porte déjà ce nom"
        : undefined;

  const reset = () => {
    setName(category?.name ?? "");
    setTagline(category?.tagline ?? "");
    setSubmitted(false);
  };

  // Identifiant tiré du nom, rendu unique ; conservé à la modification (sert d'ancre sur /prestations)
  const newId = () => {
    const base = slugify(trimmedName) || "categorie";
    const ids = new Set(categories.map((c) => c.id));
    if (!ids.has(base)) return base;
    let n = 2;
    while (ids.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (nameError) return;

    savePrestationCategory({ id: category?.id ?? newId(), name: trimmedName, tagline: tagline.trim() });
    setOpen(false);
    toast.success(category ? "Catégorie modifiée" : "Catégorie ajoutée", { description: trimmedName });
    if (!category) reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && category) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={dialogClassName}>
        <DialogTitle className="font-serif text-xl leading-tight font-normal">
          {category ? "Modifier la catégorie" : "Nouvelle catégorie"}
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-taupe">
          Les changements sont visibles immédiatement sur le site.
        </DialogDescription>

        <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="prestation-category-name" className={adminLabelClassName}>
              Nom *
            </label>
            <input
              id="prestation-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mains, Pieds…"
              aria-invalid={submitted && !!nameError}
              className={adminInputClassName}
            />
            {submitted && <FieldError message={nameError} />}
          </div>
          <div>
            <label htmlFor="prestation-category-tagline" className={adminLabelClassName}>
              Accroche
            </label>
            <input
              id="prestation-category-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Manucure & beauté des ongles"
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

// Suppression d'une catégorie vide ; sinon, explique qu'il faut d'abord déplacer ses prestations
const DeleteCategory = ({ category }: { category: PrestationCategory }) => {
  const removePrestationCategory = useCatalogStore((s) => s.removePrestationCategory);
  const count = category.prestations.length;
  const blocked = count > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Supprimer ${category.name}`} title="Supprimer" className={iconButtonClassName}>
          <Trash2 className="size-4" strokeWidth={1.75} />
        </button>
      </DialogTrigger>
      <DialogContent className={dialogClassName}>
        <DialogTitle className="font-serif text-xl leading-tight font-normal">
          {blocked ? `Impossible de supprimer « ${category.name} »` : `Supprimer « ${category.name} » ?`}
        </DialogTitle>
        <DialogDescription className="mt-3 text-sm text-taupe">
          {blocked
            ? `La catégorie contient encore ${count} prestation${count > 1 ? "s" : ""}. Rangez-les dans une autre catégorie ou supprimez-les avant de la supprimer.`
            : "La catégorie disparaît de la page des prestations."}
        </DialogDescription>
        <div className="mt-8 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <button type="button" className="text-sm underline-offset-4 hover:underline">
              {blocked ? "Fermer" : "Annuler"}
            </button>
          </DialogClose>
          {blocked ? (
            <Link
              href={`/admin/prestations/liste#${category.id}`}
              className={`w-full sm:w-auto ${adminButtonClassName}`}
            >
              Voir les prestations
            </Link>
          ) : (
            <DialogClose asChild>
              <button
                type="button"
                onClick={() => {
                  removePrestationCategory(category.id);
                  toast("Catégorie supprimée", { description: category.name });
                }}
                className={`w-full sm:w-auto ${adminButtonClassName}`}
              >
                Supprimer
              </button>
            </DialogClose>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Catégories de prestations : ajout, nom, accroche, ordre d'affichage et suppression
export const PrestationCategoriesEditor = () => {
  const hydrated = useCatalogHydrated();
  const categories = useCatalogStore((s) => s.categories);
  const movePrestationCategory = useCatalogStore((s) => s.movePrestationCategory);

  if (!hydrated) return <div className="min-h-96" aria-hidden />;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Catégories"
        description={`${categories.length} catégorie${categories.length > 1 ? "s" : ""} · affichées dans cet ordre sur le site, sans les catégories vides.`}
      >
        <CategoryForm
          categories={categories}
          trigger={
            <button type="button" className={adminButtonClassName}>
              <Plus className="size-4" strokeWidth={1.75} />
              Ajouter une catégorie
            </button>
          }
        />
      </AdminPageHeader>

      {categories.length > 0 ? (
        <div className="rounded-[var(--radius)] border border-sand">
          <Table className="font-sans text-cocoa">
            <TableHeader>
              <TableRow className="border-sand hover:bg-transparent">
                <TableHead className="w-20 px-4 text-taupe">Ordre</TableHead>
                <TableHead className="px-4 text-taupe">Catégorie</TableHead>
                <TableHead className="px-4 text-right text-taupe">Prestations</TableHead>
                <TableHead className="px-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category, index) => {
                const count = category.prestations.length;
                return (
                  <TableRow key={category.id} className="border-sand hover:bg-transparent">
                    <TableCell className="px-4 py-3 align-top">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => movePrestationCategory(category.id, -1)}
                          disabled={index === 0}
                          aria-label={`Monter ${category.name}`}
                          title="Monter"
                          className={`${iconButtonClassName} disabled:pointer-events-none disabled:opacity-30`}
                        >
                          <ArrowUp className="size-4" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePrestationCategory(category.id, 1)}
                          disabled={index === categories.length - 1}
                          aria-label={`Descendre ${category.name}`}
                          title="Descendre"
                          className={`${iconButtonClassName} disabled:pointer-events-none disabled:opacity-30`}
                        >
                          <ArrowDown className="size-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top whitespace-normal">
                      <p>{category.name}</p>
                      {category.tagline ? (
                        <p className="mt-0.5 line-clamp-2 max-w-xl text-xs text-taupe">{category.tagline}</p>
                      ) : (
                        <p className="mt-0.5 text-xs text-taupe italic">Sans accroche</p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right align-top whitespace-nowrap">
                      <Link
                        href={`/admin/prestations/liste#${category.id}`}
                        className="tabular-nums underline-offset-4 hover:underline"
                      >
                        {count} prestation{count > 1 && "s"}
                      </Link>
                      {count === 0 && <p className="text-xs text-taupe">masquée sur le site</p>}
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <CategoryForm
                          key={`${category.name}|${category.tagline}`}
                          category={category}
                          categories={categories}
                          trigger={
                            <button
                              type="button"
                              aria-label={`Modifier ${category.name}`}
                              title="Modifier"
                              className={iconButtonClassName}
                            >
                              <Pencil className="size-4" strokeWidth={1.75} />
                            </button>
                          }
                        />
                        <DeleteCategory category={category} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-center font-serif text-lg text-cocoa">
          Aucune catégorie : ajoutez-en une pour pouvoir créer des prestations.
        </p>
      )}
    </div>
  );
};

"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AdminPageHeader,
  AdminPanel,
  adminButtonClassName,
  adminInputClassName,
  adminLabelClassName,
  adminSmallOutlineButtonClassName,
  adminTextareaClassName,
  PendingLabel,
} from "@/components/admin/admin-ui";
import { AdminListSkeleton } from "@/components/admin/admin-skeleton";
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
import { errorMessage } from "@/lib/api/client";
import type { AdminProductCategory } from "@/lib/produits";
import { useAdminBoutiqueStore, useAdminCategoriesLoaded } from "@/lib/stores/admin-boutique-store";
import { iconButtonClassName } from "./product-actions";

const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const dialogClassName = "gap-0 rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-md md:p-8";

type CategoryFormProps = {
  // Absente : création d'une catégorie
  category?: AdminProductCategory;
  categories: AdminProductCategory[];
  trigger: ReactNode;
};

// Ajout ou modification d'une catégorie (nom et texte par défaut des fiches produit)
const CategoryForm = ({ category, categories, trigger }: CategoryFormProps) => {
  const saveCategory = useAdminBoutiqueStore((s) => s.saveCategory);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
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
    setDescription(category?.description ?? "");
    setSubmitted(false);
  };

  // Identifiant tiré du nom par l'API à la création, conservé ensuite (lié aux produits)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (nameError || saving) return;

    setSaving(true);
    try {
      await saveCategory({ name: trimmedName, description: description.trim() }, category?.id);
      setOpen(false);
      toast.success(category ? "Catégorie modifiée" : "Catégorie ajoutée", { description: trimmedName });
      if (!category) reset();
    } catch (error) {
      toast.error(category ? `« ${category.name} » n'a pas été modifiée` : `« ${trimmedName} » n'a pas été ajoutée`, {
        description: errorMessage(error),
      });
    } finally {
      setSaving(false);
    }
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
          Les changements sont visibles immédiatement dans la boutique.
        </DialogDescription>

        <form onSubmit={(e) => void submit(e)} noValidate className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="category-name" className={adminLabelClassName}>
              Nom *
            </label>
            <input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vernis, Accessoires…"
              aria-invalid={submitted && !!nameError}
              className={adminInputClassName}
            />
            {submitted && <FieldError message={nameError} />}
          </div>
          <div>
            <label htmlFor="category-description" className={adminLabelClassName}>
              Description
            </label>
            <textarea
              id="category-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={adminTextareaClassName}
            />
          </div>

          <div className="mt-4 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <button type="button" className="text-sm underline-offset-4 hover:underline">
                Annuler
              </button>
            </DialogClose>
            <button type="submit" disabled={saving} className={`w-full sm:w-auto ${adminButtonClassName}`}>
              <PendingLabel pending={saving} pendingLabel="Enregistrement…">Enregistrer</PendingLabel>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Suppression d'une catégorie vide ; sinon, explique qu'il faut d'abord déplacer ses produits
const DeleteCategory = ({ category }: { category: AdminProductCategory }) => {
  const removeCategory = useAdminBoutiqueStore((s) => s.removeCategory);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const productCount = category.productCount;
  const blocked = productCount > 0;

  const confirm = async () => {
    setDeleting(true);
    try {
      await removeCategory(category.id);
      setOpen(false);
      toast("Catégorie supprimée", { description: category.name });
    } catch (error) {
      toast.error(`« ${category.name} » n'a pas été supprimée`, { description: errorMessage(error) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            ? `La catégorie contient encore ${productCount} produit${productCount > 1 ? "s" : ""}. Rangez-les dans une autre catégorie avant de la supprimer.`
            : "La catégorie disparaît de la boutique et des filtres."}
        </DialogDescription>
        <div className="mt-8 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <button type="button" className="text-sm underline-offset-4 hover:underline">
              {blocked ? "Fermer" : "Annuler"}
            </button>
          </DialogClose>
          {blocked ? (
            <Link
              href={`/admin/boutique/produits?categorie=${encodeURIComponent(category.id)}`}
              className={`w-full sm:w-auto ${adminButtonClassName}`}
            >
              Voir les produits
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={deleting}
              className={`w-full sm:w-auto ${adminButtonClassName}`}
            >
              <PendingLabel pending={deleting} pendingLabel="Suppression…">Supprimer</PendingLabel>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Bandeau affiché quand les catégories n'ont pas pu être lues : la liste est absente ou périmée
const CategoriesLoadError = () => {
  const loadError = useAdminBoutiqueStore((s) => s.categoriesError);
  const load = useAdminBoutiqueStore((s) => s.loadCategories);
  const [retrying, setRetrying] = useState(false);

  if (!loadError) return null;

  const retry = async () => {
    setRetrying(true);
    await load();
    setRetrying(false);
  };

  return (
    <AdminPanel role="alert" className="flex flex-wrap items-center justify-between gap-4">
      <div className="font-sans text-sm text-cocoa">
        <p className="font-medium">
          Les catégories n&apos;ont pas pu être lues : la liste ci-dessous peut être incomplète ou dépassée.
        </p>
        <p className="mt-1 text-taupe">{loadError}</p>
      </div>
      <button type="button" onClick={() => void retry()} disabled={retrying} className={adminSmallOutlineButtonClassName}>
        {retrying ? "Lecture…" : "Relire les catégories"}
      </button>
    </AdminPanel>
  );
};

// Catégories de la boutique : ajout, nom, description, ordre d'affichage et suppression
export const CategoriesEditor = () => {
  const loaded = useAdminCategoriesLoaded();
  const categories = useAdminBoutiqueStore((s) => s.categories);
  const shownIds = useAdminBoutiqueStore((s) => s.shownCategoryIds);
  const moveCategory = useAdminBoutiqueStore((s) => s.moveCategory);
  const loadError = useAdminBoutiqueStore((s) => s.categoriesError);
  const [moving, setMoving] = useState(false);

  if (!loaded) return <AdminListSkeleton filters={0} columns={4} />;

  const move = async (category: AdminProductCategory, offset: -1 | 1) => {
    setMoving(true);
    try {
      await moveCategory(category.id, offset);
    } catch (error) {
      toast.error(`« ${category.name} » n'a pas été déplacée`, { description: errorMessage(error) });
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Catégories"
        description={`${categories.length} catégorie${categories.length > 1 ? "s" : ""} · affichées dans cet ordre en boutique, sans les catégories vides.`}
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

      <CategoriesLoadError />

      {categories.length > 0 ? (
        <div className="rounded-[var(--radius)] border border-sand">
          <Table className="font-sans text-cocoa">
            <TableHeader>
              <TableRow className="border-sand hover:bg-transparent">
                <TableHead className="w-20 px-4 text-taupe">Ordre</TableHead>
                <TableHead className="px-4 text-taupe">Catégorie</TableHead>
                <TableHead className="px-4 text-right text-taupe">Produits</TableHead>
                <TableHead className="px-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category, index) => {
                const total = category.productCount;
                return (
                  <TableRow key={category.id} className="border-sand hover:bg-transparent">
                    <TableCell className="px-4 py-3 align-top">
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => void move(category, -1)}
                          disabled={index === 0 || moving}
                          aria-label={`Monter ${category.name}`}
                          title="Monter"
                          className={`${iconButtonClassName} disabled:pointer-events-none disabled:opacity-30`}
                        >
                          <ArrowUp className="size-4" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void move(category, 1)}
                          disabled={index === categories.length - 1 || moving}
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
                      {category.description ? (
                        <p className="mt-0.5 line-clamp-2 max-w-xl text-xs text-taupe">{category.description}</p>
                      ) : (
                        <p className="mt-0.5 text-xs text-taupe italic">Sans description</p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right align-top whitespace-nowrap">
                      <Link
                        href={`/admin/boutique/produits?categorie=${encodeURIComponent(category.id)}`}
                        className="tabular-nums underline-offset-4 hover:underline"
                      >
                        {total} produit{total > 1 && "s"}
                      </Link>
                      {shownIds && (
                        <p className="text-xs text-taupe">
                          {shownIds.includes(category.id) ? "affichée en boutique" : "masquée en boutique"}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <CategoryForm
                          key={`${category.name}|${category.description}`}
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
        !loadError && (
          <p className="text-center font-serif text-lg text-cocoa">
            Aucune catégorie : ajoutez-en une pour pouvoir créer des produits.
          </p>
        )
      )}
    </div>
  );
};

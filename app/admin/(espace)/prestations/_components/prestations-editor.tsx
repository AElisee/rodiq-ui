"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AdminPageHeader,
  AdminPanel,
  adminButtonClassName,
  adminInputClassName,
  adminLabelClassName,
  adminSmallOutlineButtonClassName,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatPrice,
  type Prestation,
  type PrestationCategory,
} from "@/lib/prestations";
import { errorMessage } from "@/lib/api/client";
import {
  usePrestationsHydrated,
  usePrestationsStore,
} from "@/lib/stores/prestations-store";
import { iconButtonClassName } from "../../boutique/_components/product-actions";

// Échec d'une action de la carte : le titre dit ce qui n'a pas été fait, la description pourquoi
export const reportFailure = (title: string) => (error: unknown) => {
  toast.error(title, { description: errorMessage(error) });
};

// Bandeau affiché quand la carte n'a pas pu être lue : les données affichées sont absentes ou périmées
export const CarteLoadError = () => {
  const loadError = usePrestationsStore((s) => s.loadError);
  const load = usePrestationsStore((s) => s.load);
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
          La carte des prestations n&apos;a pas pu être lue : la liste ci-dessous
          peut être incomplète ou dépassée.
        </p>
        <p className="mt-1 text-taupe">{loadError}</p>
      </div>
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className={adminSmallOutlineButtonClassName}
      >
        {retrying ? "Lecture…" : "Relire la carte"}
      </button>
    </AdminPanel>
  );
};

export const dialogClassName =
  "gap-0 rounded-[var(--radius)] bg-pearl p-6 font-sans text-cocoa sm:max-w-md md:p-8";

export const slugify = (text: string) =>
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
const PrestationForm = ({
  categories,
  categoryId: initialCategoryId,
  prestation,
  trigger,
}: PrestationFormProps) => {
  const savePrestation = usePrestationsStore((s) => s.savePrestation);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(prestation?.name ?? "");
  const [price, setPrice] = useState(
    prestation ? String(prestation.price) : "",
  );
  const [fromPrice, setFromPrice] = useState(prestation?.fromPrice ?? false);
  const [note, setNote] = useState(prestation?.note ?? "");
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [submitted, setSubmitted] = useState(false);

  const priceValue = Number(price);
  const nameError =
    name.trim().length < 2 ? "Indiquez le nom de la prestation" : undefined;
  const priceError =
    !price || !Number.isInteger(priceValue) || priceValue <= 0
      ? "Indiquez un prix en FCFA (nombre entier)"
      : priceValue > 10_000_000
        ? "Prix : 10 000 000 FCFA au plus"
        : undefined;

  const reset = () => {
    setName(prestation?.name ?? "");
    setPrice(prestation ? String(prestation.price) : "");
    setFromPrice(prestation?.fromPrice ?? false);
    setNote(prestation?.note ?? "");
    setCategoryId(initialCategoryId);
    setSubmitted(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (nameError || priceError) return;

    const fields = {
      name: name.trim(),
      price: priceValue,
      fromPrice: fromPrice || undefined,
      note: note.trim() || undefined,
    };
    setSaving(true);
    try {
      await savePrestation(categoryId, fields, prestation?.id);
      setOpen(false);
      toast.success(prestation ? "Prestation modifiée" : "Prestation ajoutée", {
        description: fields.name,
      });
      if (!prestation) reset();
    } catch (error) {
      reportFailure(
        prestation
          ? `« ${prestation.name} » n'a pas été modifiée`
          : `« ${fields.name} » n'a pas été ajoutée`,
      )(error);
    } finally {
      setSaving(false);
    }
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
      <DialogContent className={dialogClassName}>
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
              maxLength={80}
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
              <label
                htmlFor="prestation-category"
                className={adminLabelClassName}
              >
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
              Précision
            </label>
            <input
              id="prestation-note"
              value={note}
              maxLength={120}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mèches incluses, mains et pieds…"
              className={adminInputClassName}
            />
          </div>

          <div className="mt-4 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <button
                type="button"
                className="text-sm underline-offset-4 hover:underline"
              >
                Annuler
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={saving}
              className={`w-full sm:w-auto ${adminButtonClassName}`}
            >
              <PendingLabel pending={saving} pendingLabel="Enregistrement…">Enregistrer</PendingLabel>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DeletePrestation = ({ prestation }: { prestation: Prestation }) => {
  const removePrestation = usePrestationsStore((s) => s.removePrestation);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      await removePrestation(prestation.id);
      setOpen(false);
      toast("Prestation supprimée", { description: prestation.name });
    } catch (error) {
      reportFailure(`« ${prestation.name} » n'a pas été supprimée`)(error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Supprimer ${prestation.name}`}
          title="Supprimer"
          className={iconButtonClassName}
        >
          <Trash2 className="size-4" strokeWidth={1.75} />
        </button>
      </DialogTrigger>
      <DialogContent className={dialogClassName}>
        <DialogTitle className="font-serif text-xl leading-tight font-normal">
          Supprimer « {prestation.name} » ?
        </DialogTitle>
        <DialogDescription className="mt-3 text-sm text-taupe">
          La prestation ne sera plus proposée à la réservation. Les réservations
          existantes sont conservées.
        </DialogDescription>
        <div className="mt-8 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <button
              type="button"
              className="text-sm underline-offset-4 hover:underline"
            >
              Annuler
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={deleting}
            className={`w-full sm:w-auto ${adminButtonClassName}`}
          >
            <PendingLabel pending={deleting} pendingLabel="Suppression…">Supprimer</PendingLabel>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const moveButtonClassName = `${iconButtonClassName} disabled:pointer-events-none disabled:opacity-30`;

// Prestations par catégorie, dans l'ordre affiché sur /prestations et proposé à la réservation
export const PrestationsEditor = () => {
  const hydrated = usePrestationsHydrated();
  const categories = usePrestationsStore((s) => s.categories);
  const movePrestation = usePrestationsStore((s) => s.movePrestation);

  // Onglet actif = catégorie du hash (#id), pour les liens venant de /admin/prestations/categories
  const [activeId, setActiveId] = useState<string>();
  useEffect(() => {
    const readHash = () => setActiveId(decodeURIComponent(window.location.hash.slice(1)) || undefined);
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  const selectCategory = (id: string) => {
    setActiveId(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  const move = (prestation: Prestation, offset: -1 | 1) =>
    movePrestation(prestation.id, offset).catch(
      reportFailure(`« ${prestation.name} » n'a pas été déplacée`),
    );

  if (!hydrated) return <AdminListSkeleton filters={0} columns={4} />;

  const total = categories.reduce((sum, c) => sum + c.prestations.length, 0);
  // Catégorie inconnue (supprimée, hash erroné) : premier onglet
  const activeCategory =
    categories.find((c) => c.id === activeId) ?? categories[0];

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Prestations"
        description={`${total} prestation${total > 1 ? "s" : ""} · affichées dans cet ordre sur le site et proposées à la réservation.`}
      >
        {categories.length > 0 && (
          <PrestationForm
            categories={categories}
            key={activeCategory.id}
            categoryId={activeCategory.id}
            trigger={
              <button type="button" className={adminButtonClassName}>
                <Plus className="size-4" strokeWidth={1.75} />
                Ajouter une prestation
              </button>
            }
          />
        )}
      </AdminPageHeader>

      <CarteLoadError />

      {categories.length > 0 ? (
        <Tabs
          value={activeCategory.id}
          onValueChange={selectCategory}
          className="mx-auto w-full max-w-3xl flex-col gap-6"
        >
          <TabsList
            variant="line"
            aria-label="Catégories de prestations"
            className="h-auto! w-full justify-start gap-2 overflow-x-auto overflow-y-hidden rounded-none border-b border-sand p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="mb-3 h-auto flex-none cursor-pointer rounded-full px-4 py-2 font-sans text-sm font-normal text-taupe after:hidden hover:text-cocoa focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none data-[state=active]:bg-sand! data-[state=active]:text-cocoa"
              >
                {category.name}
                <span className="text-xs text-taupe">
                  {category.prestations.length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <AdminPanel className="flex flex-col gap-5">
                <header>
                  <h2 className="font-serif text-xl leading-tight text-cocoa">
                    {category.name}
                  </h2>
                  {category.tagline && (
                    <p className="mt-0.5 font-sans text-sm text-taupe">
                      {category.tagline}
                    </p>
                  )}
                </header>

                {category.prestations.length > 0 ? (
                  <ul className="divide-y divide-sand border-y border-sand font-sans text-sm text-cocoa">
                    {category.prestations.map((prestation, index) => (
                      <li
                        key={prestation.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex shrink-0 items-center">
                            <button
                              type="button"
                              onClick={() => move(prestation, -1)}
                              disabled={index === 0}
                              aria-label={`Monter ${prestation.name}`}
                              title="Monter"
                              className={moveButtonClassName}
                            >
                              <ArrowUp className="size-4" strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              onClick={() => move(prestation, 1)}
                              disabled={index === category.prestations.length - 1}
                              aria-label={`Descendre ${prestation.name}`}
                              title="Descendre"
                              className={moveButtonClassName}
                            >
                              <ArrowDown className="size-4" strokeWidth={1.75} />
                            </button>
                          </div>
                          <div className="min-w-0">
                            <p>{prestation.name}</p>
                            {prestation.note && (
                              <p className="text-xs text-taupe">{prestation.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="mr-2 whitespace-nowrap">
                            {formatPrice(prestation.price, prestation.fromPrice)}
                          </span>
                          <PrestationForm
                            key={JSON.stringify(prestation)}
                            categories={categories}
                            categoryId={category.id}
                            prestation={prestation}
                            trigger={
                              <button
                                type="button"
                                aria-label={`Modifier ${prestation.name}`}
                                title="Modifier"
                                className={iconButtonClassName}
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
                    <button
                      type="button"
                      className={`self-start ${adminSmallOutlineButtonClassName}`}
                    >
                      <Plus className="size-3.5" strokeWidth={1.75} />
                      Ajouter à {category.name}
                    </button>
                  }
                />
              </AdminPanel>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <p className="text-center font-serif text-lg text-cocoa">
          Aucune catégorie :{" "}
          <Link
            href="/admin/prestations/categories"
            className="underline underline-offset-4"
          >
            ajoutez-en une
          </Link>{" "}
          pour pouvoir créer des prestations.
        </p>
      )}
    </div>
  );
};

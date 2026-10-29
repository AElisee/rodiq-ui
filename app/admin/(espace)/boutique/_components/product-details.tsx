"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ExternalLink, ImagePlus, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminBackLink, DetailNotFound, DetailPanel, DetailRow, detailLinkClassName } from "@/components/admin/admin-detail";
import { AdminPageHeader, OrderStatusBadge, StockBadge, adminSmallOutlineButtonClassName, PendingLabel } from "@/components/admin/admin-ui";
import { AdminDetailSkeleton } from "@/components/admin/admin-skeleton";
import { ProductVisual } from "@/components/shop/product-visual";
import { errorMessage } from "@/lib/api/client";
import { resizeImage } from "@/lib/images";
import { formatPrice } from "@/lib/prestations";
import { MAX_PHOTOS, VARIANT_LABEL, formatMeasure, getDiscountPercent, type AdminProduct } from "@/lib/produits";
import { useAdminBoutiqueStore, useAdminCategories } from "@/lib/stores/admin-boutique-store";
import type { ReadError } from "@/lib/stores/shop-store";
import { useAdminOrdersStore, useAllOrdersLoaded } from "@/lib/stores/admin-orders-store";
import { cn } from "@/lib/utils";
import { DeleteProduct, iconButtonClassName } from "./product-actions";
import { photoErrorMessage, useSoldCounts } from "./product-form";

const RECENT_ORDERS = 5;

const formatDate = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: fr });

// Fiche d'un produit relue à chaque ouverture : elle a pu changer depuis la liste (stock, autre onglet)
export const useAdminProduct = (id: string) => {
  const product = useAdminBoutiqueStore((s) => s.details[id]);
  const error = useAdminBoutiqueStore((s) => s.detailErrors[id]);
  const loadDetail = useAdminBoutiqueStore((s) => s.loadDetail);

  useEffect(() => {
    void loadDetail(id);
  }, [id, loadDetail]);

  return { product, error, retry: () => loadDetail(id) };
};

// Fiche pas encore lue : chargement, produit introuvable ou lecture ratée
export const ProductReadState = ({ error, retry }: { error?: ReadError; retry: () => Promise<void> }) => {
  if (error?.status === 404)
    return (
      <div className="flex flex-col gap-6 pt-6">
        <AdminBackLink href="/admin/boutique/produits">Catalogue produits</AdminBackLink>
        <DetailNotFound title="Ce produit est introuvable." href="/admin/boutique/produits" label="Retour aux produits" />
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col gap-6 pt-6">
        <AdminBackLink href="/admin/boutique/produits">Catalogue produits</AdminBackLink>
        <div role="alert" className="rounded-[var(--radius)] border border-sand p-6 font-sans text-sm text-cocoa">
          <p className="font-serif text-lg">Le produit n&apos;a pas pu être chargé.</p>
          <p className="mt-2 text-taupe">{error.message}</p>
          <button type="button" onClick={() => void retry()} className="mt-4 underline underline-offset-4">
            Réessayer
          </button>
        </div>
      </div>
    );

  return <AdminDetailSkeleton />;
};

// Photos du produit : chaque ajout, retrait ou changement de photo principale est enregistré aussitôt
const ProductPhotos = ({ product }: { product: AdminProduct }) => {
  const addPhoto = useAdminBoutiqueStore((s) => s.addPhoto);
  const removePhoto = useAdminBoutiqueStore((s) => s.removePhoto);
  const movePhotoFirst = useAdminBoutiqueStore((s) => s.movePhotoFirst);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const photos = product.images ?? [];
  // Photo affichée dans le grand cadre ; bornée si des photos ont été retirées entre-temps
  const current = photoIndex < photos.length ? photoIndex : 0;

  // Une requête à la fois : l'ordre des photos reste celui des clics
  const run = async (request: () => Promise<unknown>, failure: string, success?: string) => {
    setBusy(true);
    try {
      await request();
      if (success) toast.success(success, { description: product.name });
      return true;
    } catch (error) {
      toast.error(failure, { description: errorMessage(error) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (files: FileList | null) => {
    const selected = Array.from(files ?? []).filter((file) => file.type.startsWith("image/"));
    const room = MAX_PHOTOS - photos.length;
    if (selected.length > room) {
      toast(`${MAX_PHOTOS} photos au maximum par produit : ${selected.length - room} non ajoutée(s)`);
    }
    for (const file of selected.slice(0, room)) {
      let image: string;
      try {
        image = await resizeImage(file);
      } catch (error) {
        toast.error(`« ${file.name} » n'a pas été ajoutée`, { description: photoErrorMessage(error) });
        continue;
      }
      await run(() => addPhoto(product.id, image), `« ${file.name} » n'a pas été ajoutée`, "Photo ajoutée");
    }
  };

  const photoId = product.photoIds[current];

  return (
    <DetailPanel title="Photos">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-sand">
        <ProductVisual
          key={current}
          product={product}
          image={photos[current]}
          alt={photos.length > 1 ? `${product.name}, photo ${current + 1} sur ${photos.length}` : product.name}
          sizes="(min-width: 1024px) 320px, 100vw"
        />
      </div>
      {photoId && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-taupe">
          <span>{current === 0 ? "Photo principale" : `Photo ${current + 1}`}</span>
          <span className="flex items-center gap-1">
            {current > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => movePhotoFirst(product.id, photoId),
                    "La photo principale n'a pas été changée",
                    "Photo principale changée",
                  ).then((ok) => ok && setPhotoIndex(0))
                }
                aria-label={`Faire de la photo ${current + 1} la photo principale`}
                title="Photo principale"
                className={iconButtonClassName}
              >
                <Star className="size-4" strokeWidth={1.75} />
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(
                  () => removePhoto(product.id, photoId),
                  `La photo ${current + 1} n'a pas été retirée`,
                  "Photo retirée",
                )
              }
              aria-label={`Retirer la photo ${current + 1}`}
              title="Retirer"
              className={iconButtonClassName}
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
            </button>
          </span>
        </div>
      )}
      {photos.length > 1 && (
        <ul aria-label="Photos du produit" className="mt-3 grid grid-cols-4 gap-2">
          {photos.map((image, index) => (
            <li key={product.photoIds[index] ?? index}>
              <button
                type="button"
                onClick={() => setPhotoIndex(index)}
                aria-label={`Afficher la photo ${index + 1}`}
                aria-current={index === current}
                className={cn(
                  "relative block aspect-[4/5] w-full overflow-hidden rounded-md border-2 bg-sand transition-colors",
                  index === current ? "border-cocoa" : "border-transparent hover:border-taupe",
                )}
              >
                <ProductVisual product={product} image={image} alt="" sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!photos.length && (
        <p className="mt-3 text-xs text-taupe">Pas encore de photo : la boutique affiche un visuel provisoire.</p>
      )}
      {photos.length < MAX_PHOTOS && (
        <label
          className={cn(
            `mt-4 cursor-pointer ${adminSmallOutlineButtonClassName}`,
            busy && "pointer-events-none opacity-60",
          )}
        >
          <ImagePlus className="size-3.5" strokeWidth={1.75} aria-hidden />
          <PendingLabel pending={busy} pendingLabel="Envoi…">Ajouter des photos</PendingLabel>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            disabled={busy}
            className="sr-only"
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}
      <p className="mt-2 text-xs text-taupe">
        {MAX_PHOTOS} photos au maximum (JPEG, PNG ou WebP), enregistrées dès leur ajout.
      </p>
    </DetailPanel>
  );
};

// Fiche d'un produit : photos, informations, déclinaisons, stock, ventes et dernières commandes
export const ProductDetails = ({ id }: { id: string }) => {
  const router = useRouter();
  const ordersHydrated = useAllOrdersLoaded();
  const { product, error, retry } = useAdminProduct(id);
  const categories = useAdminCategories();
  const orders = useAdminOrdersStore((s) => s.all);
  const sold = useSoldCounts();
  const [deleted, setDeleted] = useState(false);

  // Commandes contenant le produit, les plus récentes d'abord
  const productOrders = useMemo(
    () =>
      orders
        .filter((o) => o.lines.some((l) => l.productId === id))
        .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders, id],
  );

  if (deleted) return <div className="min-h-96" aria-hidden />;
  if (!product || !ordersHydrated) return <ProductReadState error={error} retry={retry} />;

  const category = categories.find((c) => c.id === product.categoryId);
  const discount = getDiscountPercent(product);
  const soldFor = (variantId?: string) => sold.get(`${product.id}:${variantId ?? ""}`) ?? 0;
  const soldTotal = product.variants.length
    ? product.variants.reduce((sum, v) => sum + soldFor(v.id), 0)
    : soldFor();
  const editHref = `/admin/boutique/produits/${encodeURIComponent(product.id)}/modifier`;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={product.name}
        description={`${category?.name ?? "Sans catégorie"}${product.hidden ? " · masqué de la boutique" : ""}`}
      >
        <StockBadge level={product.level} />
        <Link href={editHref} className={adminSmallOutlineButtonClassName}>
          <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
          Modifier
        </Link>
        <DeleteProduct
          product={product}
          onDeleted={() => {
            setDeleted(true);
            router.push("/admin/boutique/produits");
          }}
        />
      </AdminPageHeader>

      <AdminBackLink href="/admin/boutique/produits">Tous les produits</AdminBackLink>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailPanel
            title="Informations"
            action={
              !product.hidden && (
                <Link href={`/boutique/${encodeURIComponent(product.id)}`} target="_blank" className={`inline-flex items-center gap-1 ${detailLinkClassName}`}>
                  Voir en boutique
                  <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
                </Link>
              )
            }
          >
            <dl className="flex flex-col gap-3 text-sm">
              <DetailRow label="Catégorie">
                {category ? (
                  <Link
                    href={`/admin/boutique/produits?categorie=${encodeURIComponent(category.id)}`}
                    className={detailLinkClassName}
                  >
                    {category.name}
                  </Link>
                ) : (
                  "Sans catégorie"
                )}
              </DetailRow>
              <DetailRow label="Prix">{formatPrice(product.price)}</DetailRow>
              {discount !== null && (
                <DetailRow label="Promotion">
                  <s className="text-taupe">{formatPrice(product.compareAtPrice!)}</s> · -{discount}%
                </DetailRow>
              )}
              {product.capacity && <DetailRow label="Contenance">{formatMeasure(product.capacity)}</DetailRow>}
              {product.weight && <DetailRow label="Poids">{formatMeasure(product.weight)}</DetailRow>}
              <DetailRow label="Visible en boutique">{product.hidden ? "Non" : "Oui"}</DetailRow>
              <DetailRow label="Ajouté le">{formatDate(product.createdAt)}</DetailRow>
              <DetailRow label="Modifié le">{formatDate(product.updatedAt)}</DetailRow>
              <DetailRow label="Identifiant">
                <span className="text-taupe">{product.id}</span>
              </DetailRow>
            </dl>

            <div className="mt-6 border-t border-sand pt-4">
              <p className="mb-2 text-sm text-taupe">Description</p>
              {product.description ? (
                <p className="text-sm whitespace-pre-line">{product.description}</p>
              ) : (
                <p className="text-sm text-taupe">
                  {category?.description
                    ? `Pas de description propre : la boutique affiche celle de la catégorie. « ${category.description} »`
                    : "Pas de description."}
                </p>
              )}
            </div>
          </DetailPanel>

          <DetailPanel title={product.variants.length ? `${VARIANT_LABEL}s` : "Stock"}>
            {product.variants.length ? (
              <ul className="flex flex-col text-sm">
                {product.variants.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-sand py-3 last:border-b-0">
                    <span>{v.name}</span>
                    <span className="flex items-center gap-3">
                      <StockBadge level={v.level} />
                      <span className="text-taupe tabular-nums">
                        <span className={cn(v.level !== "ok" && "text-cocoa")}>{v.stock}</span> en stock ·{" "}
                        {soldFor(v.id)} vendu{soldFor(v.id) > 1 ? "s" : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-taupe">Produit sans déclinaison, suivi par un stock unique.</p>
            )}
          </DetailPanel>

          <DetailPanel title="Dernières commandes">
            {productOrders.length ? (
              <ul className="flex flex-col text-sm">
                {productOrders.slice(0, RECENT_ORDERS).map((order) => {
                  const quantity = order.lines
                    .filter((l) => l.productId === product.id)
                    .reduce((sum, l) => sum + l.quantity, 0);
                  return (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-sand py-3 last:border-b-0">
                      <span className="flex flex-col">
                        <Link href={`/admin/commandes/${order.id}`} className={detailLinkClassName}>
                          Réf. {order.reference}
                        </Link>
                        <span className="text-xs text-taupe">
                          {order.customer.firstName} {order.customer.lastName} · {formatDate(order.createdAt)}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-taupe tabular-nums">× {quantity}</span>
                        <OrderStatusBadge order={order} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-taupe">Aucune commande pour ce produit.</p>
            )}
            {productOrders.length > RECENT_ORDERS && (
              <p className="mt-3 text-xs text-taupe">
                {productOrders.length} commandes au total.
              </p>
            )}
          </DetailPanel>
        </div>

        <div className="flex flex-col gap-6">
          <ProductPhotos product={product} />

          <DetailPanel title="Stock et ventes">
            <dl className="flex flex-col gap-3 text-sm">
              <DetailRow label="Reste en stock">
                <span className="tabular-nums">{product.totalStock}</span>
              </DetailRow>
              <DetailRow label="Seuil d'alerte">{product.lowStockThreshold}</DetailRow>
              <DetailRow label="Déjà vendus">{soldTotal}</DetailRow>
              <DetailRow label="Commandes">{productOrders.length}</DetailRow>
            </dl>
            <p className="mt-4 text-xs text-taupe">
              Ventes et commandes : données de démonstration, en attendant le module de commandes de l&apos;API.
            </p>
          </DetailPanel>
        </div>
      </div>
    </div>
  );
};

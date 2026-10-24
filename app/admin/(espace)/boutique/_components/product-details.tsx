"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminBackLink, DetailNotFound, DetailPanel, DetailRow, detailLinkClassName } from "@/components/admin/admin-detail";
import { AdminPageHeader, OrderStatusBadge, StockBadge, adminSmallOutlineButtonClassName } from "@/components/admin/admin-ui";
import { ProductVisual } from "@/components/shop/product-visual";
import { formatPrice } from "@/lib/prestations";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_VARIANT_LABEL,
  formatMeasure,
  getDiscountPercent,
  productLevel,
  productStock,
  stockLevel,
} from "@/lib/produits";
import { useCatalogHydrated, useCatalogProduct, useProductCategories } from "@/lib/stores/catalog-store";
import { useOrderStore, useOrdersHydrated } from "@/lib/stores/order-store";
import { cn } from "@/lib/utils";
import { ProductRowActions } from "./product-actions";
import { useSoldCounts } from "./product-form";

const RECENT_ORDERS = 5;

const formatDate = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: fr });

// Fiche d'un produit : photos, informations, déclinaisons, stock, ventes et dernières commandes
export const ProductDetails = ({ id }: { id: string }) => {
  const router = useRouter();
  const hydrated = useCatalogHydrated();
  const ordersHydrated = useOrdersHydrated();
  const product = useCatalogProduct(id);
  const categories = useProductCategories();
  const orders = useOrderStore((s) => s.orders);
  const sold = useSoldCounts();
  const [deleted, setDeleted] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Commandes contenant le produit, les plus récentes d'abord
  const productOrders = useMemo(
    () =>
      orders
        .filter((o) => o.lines.some((l) => l.productId === id))
        .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders, id],
  );

  if (!hydrated || !ordersHydrated || deleted) return <div className="min-h-96" aria-hidden />;

  if (!product)
    return (
      <div className="flex flex-col gap-6 pt-6">
        <AdminBackLink href="/admin/boutique/produits">Produits</AdminBackLink>
        <DetailNotFound title="Ce produit est introuvable." href="/admin/boutique/produits" label="Retour aux produits" />
      </div>
    );

  const category = categories.find((c) => c.id === product.categoryId);
  const discount = getDiscountPercent(product);
  const threshold = product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const soldFor = (variantId?: string) => sold.get(`${product.id}:${variantId ?? ""}`) ?? 0;
  const soldTotal = product.variants?.length
    ? product.variants.reduce((sum, v) => sum + soldFor(v.id), 0)
    : soldFor();
  const photos = product.images ?? [];
  // Photo affichée dans le grand cadre ; bornée si des photos ont été retirées entre-temps
  const currentPhoto = photoIndex < photos.length ? photoIndex : 0;
  const editHref = `/admin/boutique/produits/${encodeURIComponent(product.id)}/modifier`;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={product.name}
        description={`${category?.name ?? "Sans catégorie"}${product.custom ? " · ajouté depuis l'admin" : ""}${product.hidden ? " · masqué de la boutique" : ""}`}
      >
        <StockBadge level={productLevel(product)} />
        <Link href={editHref} className={adminSmallOutlineButtonClassName}>
          <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
          Modifier
        </Link>
        <ProductRowActions
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
              <DetailRow label="Origine">{product.custom ? "Ajouté depuis l'admin" : "Catalogue"}</DetailRow>
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

          <DetailPanel title={product.variants?.length ? (product.variantLabel ?? DEFAULT_VARIANT_LABEL) : "Stock"}>
            {product.variants?.length ? (
              <ul className="flex flex-col text-sm">
                {product.variants.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-sand py-3 last:border-b-0">
                    <span>{v.name}</span>
                    <span className="flex items-center gap-3">
                      <StockBadge level={stockLevel(v.stock, threshold)} />
                      <span className="text-taupe tabular-nums">
                        <span className={cn(stockLevel(v.stock, threshold) !== "ok" && "text-cocoa")}>{v.stock}</span> en
                        stock · {soldFor(v.id)} vendu{soldFor(v.id) > 1 ? "s" : ""}
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
          <DetailPanel title="Photos">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-sand">
              <ProductVisual
                key={currentPhoto}
                product={product}
                image={photos[currentPhoto]}
                alt={photos.length > 1 ? `${product.name}, photo ${currentPhoto + 1} sur ${photos.length}` : product.name}
                sizes="(min-width: 1024px) 320px, 100vw"
              />
            </div>
            {photos.length > 1 && (
              <ul aria-label="Photos du produit" className="mt-3 grid grid-cols-4 gap-2">
                {photos.map((image, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex(index)}
                      aria-label={`Afficher la photo ${index + 1}`}
                      aria-current={index === currentPhoto}
                      className={cn(
                        "relative block aspect-[4/5] w-full overflow-hidden rounded-md border-2 bg-sand transition-colors",
                        index === currentPhoto ? "border-cocoa" : "border-transparent hover:border-taupe",
                      )}
                    >
                      <ProductVisual product={product} image={image} alt="" sizes="80px" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!photos.length && <p className="mt-3 text-xs text-taupe">Pas encore de photo : la boutique affiche un visuel provisoire.</p>}
          </DetailPanel>

          <DetailPanel title="Stock et ventes">
            <dl className="flex flex-col gap-3 text-sm">
              <DetailRow label="Reste en stock">
                <span className="tabular-nums">{productStock(product)}</span>
              </DetailRow>
              <DetailRow label="Seuil d'alerte">{threshold}</DetailRow>
              <DetailRow label="Déjà vendus">{soldTotal}</DetailRow>
              <DetailRow label="Commandes">{productOrders.length}</DetailRow>
            </dl>
            <p className="mt-4 text-xs text-taupe">
              Commandes non annulées. Le stock baisse à chaque commande et remonte si elle est annulée.
            </p>
          </DetailPanel>
        </div>
      </div>
    </div>
  );
};

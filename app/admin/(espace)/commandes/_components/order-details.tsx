"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Gem, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminBackLink, DetailNotFound, DetailPanel, DetailRow } from "@/components/admin/admin-detail";
import { escapeHtml, printDocument } from "@/components/admin/admin-export";
import {
  AdminPageHeader,
  OrderStatusBadge,
  adminSmallButtonClassName,
  adminSmallOutlineButtonClassName,
} from "@/components/admin/admin-ui";
import { ProductVisual } from "@/components/shop/product-visual";
import { errorMessage } from "@/lib/api/client";
import {
  orderItemCount,
  orderLineKey,
  orderLineName,
  orderStatusLabel,
  orderSubtotal,
  orderTotal,
  paymentMethods,
  type Order,
} from "@/lib/commandes";
import { formatPrice } from "@/lib/prestations";
import type { Product } from "@/lib/produits";
import { useAdminBoutiqueStore } from "@/lib/stores/admin-boutique-store";
import { useAdminOrdersStore } from "@/lib/stores/admin-orders-store";
import { OrderActions } from "./order-actions";

const formatDateTime = (iso: string) => format(new Date(iso), "d MMMM yyyy 'à' HH'h'mm", { locale: fr });

const paymentState = (order: Order) =>
  order.paid ? "payée" : order.status === "annulee" ? "non payée" : "à encaisser";

// Visuel provisoire (icône Gem) pour les produits encore sans photo, comme à l'écran
const gemIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 3 8 9l4 13 4-13-2.5-6"/><path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z"/><path d="M2 9h20"/></svg>`;

// Fiche imprimable (bon de préparation / de livraison) avec les photos des produits
const printOrder = (order: Order, products: Pick<Product, "id" | "images">[]) => {
  const { customer, delivery } = order;
  const lines = order.lines
    .map((line) => {
      const image = products.find((p) => p.id === line.productId)?.images?.[0];
      const visual = image
        ? `<img src="${escapeHtml(image)}" alt="">`
        : `<span class="visual">${gemIcon}</span>`;
      return `<tr><td class="thumb">${visual}</td><td>${escapeHtml(orderLineName(line))}</td>
<td class="num">${escapeHtml(formatPrice(line.unitPrice))}</td><td class="num">${line.quantity}</td>
<td class="num">${escapeHtml(formatPrice(line.unitPrice * line.quantity))}</td></tr>`;
    })
    .join("");
  const info = (label: string, value?: string) =>
    value ? `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>` : "";

  printDocument(
    `Commande ${order.reference}`,
    `<h1>Commande ${escapeHtml(order.reference)}</h1>
<p>Reçue le ${escapeHtml(formatDateTime(order.createdAt))} · ${escapeHtml(orderStatusLabel(order))}</p>
<div class="cols">
  <section><h2>Client(e)</h2><dl>
    ${info("Nom", `${customer.firstName} ${customer.lastName}`)}${info("Téléphone", customer.phone)}${info("E-mail", customer.email)}
  </dl></section>
  <section><h2>Remise</h2><dl>
    ${info("Mode", delivery.mode === "retrait" ? "Retrait au salon" : "Livraison")}${delivery.mode === "livraison" ? `${info("Commune", delivery.commune)}${info("Adresse", delivery.address)}` : ""}
    ${info("Paiement", `${paymentMethods.find((m) => m.value === order.paymentMethod)?.label} · ${paymentState(order)}`)}
  </dl></section>
</div>
<table><thead><tr><th></th><th>Article</th><th class="num">Prix</th><th class="num">Qté</th><th class="num">Total</th></tr></thead>
<tbody>${lines}</tbody>
<tfoot>
  <tr><td colspan="4" class="num">Sous-total</td><td class="num">${escapeHtml(formatPrice(orderSubtotal(order)))}</td></tr>
  <tr><td colspan="4" class="num">Livraison</td><td class="num">${escapeHtml(order.deliveryFee ? formatPrice(order.deliveryFee) : "Offerte")}</td></tr>
  <tr class="total"><td colspan="4" class="num">Total</td><td class="num">${escapeHtml(formatPrice(orderTotal(order)))}</td></tr>
</tfoot></table>
${order.note ? `<p class="note"><strong>Précision :</strong> ${escapeHtml(order.note)}</p>` : ""}
${order.cancellationReason ? `<p class="note"><strong>Motif de l'annulation :</strong> ${escapeHtml(order.cancellationReason)}</p>` : ""}`,
    `h2{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#555;margin:0 0 8px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:8px 0 24px}
  dl{margin:0;font-size:12px}
  dl div{display:flex;gap:8px;margin-bottom:4px}
  dt{color:#555;min-width:72px}
  dd{margin:0}
  td{vertical-align:middle;font-size:12px}
  .num{text-align:right;white-space:nowrap}
  .thumb{width:72px}
  .thumb img,.visual{display:block;width:64px;height:80px;object-fit:cover;border-radius:4px;background:#eee;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .visual{display:flex;align-items:center;justify-content:center;color:#999}
  .visual svg{width:24px;height:24px}
  tfoot td{border:0;padding:4px 8px}
  tfoot .total td{font-size:14px;font-weight:600;border-top:2px solid #000;padding-top:8px}
  .note{margin-top:16px;color:#000}`,
  );
};

// Fiche complète d'une commande : articles avec photos, coordonnées, remise, paiement et suivi
export const OrderDetails = ({ id }: { id: string }) => {
  const order = useAdminOrdersStore((s) => s.details[id]);
  const error = useAdminOrdersStore((s) => s.detailErrors[id]);
  const loadOrder = useAdminOrdersStore((s) => s.loadDetail);
  const markPaid = useAdminOrdersStore((s) => s.markPaid);
  const [paying, setPaying] = useState(false);
  const details = useAdminBoutiqueStore((s) => s.details);
  const detailErrors = useAdminBoutiqueStore((s) => s.detailErrors);
  const loadDetail = useAdminBoutiqueStore((s) => s.loadDetail);
  const productIds = [...new Set(order?.lines.map((line) => line.productId))].join(",");
  // Produits commandés relus (photos, produit retiré du catalogue)
  useEffect(() => {
    if (productIds) for (const productId of productIds.split(",")) void loadDetail(productId);
  }, [productIds, loadDetail]);
  const products = Object.values(details);

  // Relue à chaque ouverture : la commande a pu changer depuis la liste
  useEffect(() => {
    void loadOrder(id);
  }, [id, loadOrder]);

  if (error?.status === 404)
    return (
      <div className="flex flex-col gap-6 pt-6">
        <AdminBackLink href="/admin/commandes">Commandes</AdminBackLink>
        <DetailNotFound title="Cette commande est introuvable." href="/admin/commandes" label="Retour aux commandes" />
      </div>
    );

  if (error && !order)
    return (
      <div className="flex flex-col gap-6 pt-6">
        <AdminBackLink href="/admin/commandes">Commandes</AdminBackLink>
        <div role="alert" className="rounded-[var(--radius)] border border-sand p-6 font-sans text-sm text-cocoa">
          <p className="font-serif text-lg">La commande n&apos;a pas pu être chargée.</p>
          <p className="mt-2 text-taupe">{error.message}</p>
          <button type="button" onClick={() => void loadOrder(id)} className="mt-4 underline underline-offset-4">
            Réessayer
          </button>
        </div>
      </div>
    );

  if (!order) return <div className="min-h-96" aria-hidden />;

  const { customer, delivery } = order;
  const items = orderItemCount(order);

  const handleMarkPaid = async () => {
    setPaying(true);
    try {
      await markPaid(order.id);
      toast.success("Paiement enregistré", { description: `${order.reference} · ${formatPrice(orderTotal(order))}` });
    } catch (error) {
      toast.error(`Le paiement de la commande ${order.reference} n'a pas été enregistré`, {
        description: errorMessage(error),
      });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={`Commande ${order.reference}`} description={`Reçue le ${formatDateTime(order.createdAt)}`}>
        <OrderStatusBadge order={order} />
        <OrderActions order={order} />
        <button type="button" onClick={() => printOrder(order, products)} className={adminSmallOutlineButtonClassName}>
          <Printer className="size-3.5" strokeWidth={1.75} aria-hidden />
          Imprimer
        </button>
      </AdminPageHeader>

      <AdminBackLink href="/admin/commandes">Toutes les commandes</AdminBackLink>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DetailPanel title={`${items} article${items > 1 ? "s" : ""}`}>
            <ul className="flex flex-col gap-4">
              {order.lines.map((line) => {
                const product = products.find((p) => p.id === line.productId);
                return (
                  <li key={orderLineKey(line)} className="flex gap-4">
                    <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-[var(--radius)] bg-sand">
                      {product ? (
                        <ProductVisual product={product} sizes="64px" iconClassName="size-5" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-pearl" aria-hidden>
                          <Gem className="size-5" strokeWidth={1.25} />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 text-sm">
                      <p className="truncate">{orderLineName(line)}</p>
                      <p className="text-xs text-taupe">
                        {formatPrice(line.unitPrice)} × {line.quantity}
                        {detailErrors[line.productId]?.status === 404 && " · retiré du catalogue"}
                      </p>
                    </div>
                    <p className="self-center text-sm whitespace-nowrap">{formatPrice(line.unitPrice * line.quantity)}</p>
                  </li>
                );
              })}
            </ul>

            <dl className="mt-6 flex flex-col gap-2 border-t border-sand pt-4 text-sm">
              <DetailRow label="Sous-total">{formatPrice(orderSubtotal(order))}</DetailRow>
              <DetailRow label="Livraison">{order.deliveryFee ? formatPrice(order.deliveryFee) : "Offerte"}</DetailRow>
              <div className="flex justify-between gap-6 border-t border-sand pt-3 font-serif text-lg">
                <dt>Total</dt>
                <dd className="font-sans">{formatPrice(orderTotal(order))}</dd>
              </div>
            </dl>
          </DetailPanel>

          {(order.note || order.cancellationReason) && (
            <DetailPanel title="Remarques">
              <div className="flex flex-col gap-4 text-sm">
                {order.note && (
                  <p>
                    <span className="block text-taupe">Précision du client ou de la cliente</span>
                    {order.note}
                  </p>
                )}
                {order.cancellationReason && (
                  <p>
                    <span className="block text-taupe">
                      {order.cancelledBy === "cliente"
                        ? "Annulée par le client ou la cliente"
                        : "Motif de l'annulation (transmis au client ou à la cliente)"}
                    </span>
                    {order.cancellationReason}
                  </p>
                )}
              </div>
            </DetailPanel>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <DetailPanel title="Client(e)">
            <dl className="flex flex-col gap-3 text-sm">
              <DetailRow label="Nom">
                {customer.firstName} {customer.lastName}
              </DetailRow>
              <DetailRow label="Téléphone">
                <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="underline underline-offset-4">
                  {customer.phone}
                </a>
              </DetailRow>
              <DetailRow label="E-mail">
                <a href={`mailto:${customer.email}`} className="underline underline-offset-4">
                  {customer.email}
                </a>
              </DetailRow>
              {customer.whatsapp && <DetailRow label="WhatsApp">{customer.whatsapp}</DetailRow>}
            </dl>
          </DetailPanel>

          <DetailPanel title="Remise">
            <dl className="flex flex-col gap-3 text-sm">
              <DetailRow label="Mode">{delivery.mode === "retrait" ? "Retrait au salon" : "Livraison"}</DetailRow>
              {delivery.mode === "livraison" && delivery.commune && (
                <DetailRow label="Commune">{delivery.commune}</DetailRow>
              )}
              {delivery.mode === "livraison" && delivery.address && (
                <DetailRow label="Adresse de livraison">{delivery.address}</DetailRow>
              )}
              {order.updatedAt && <DetailRow label="Dernière mise à jour">{formatDateTime(order.updatedAt)}</DetailRow>}
            </dl>
          </DetailPanel>

          <DetailPanel
            title="Paiement"
            action={
              !order.paid &&
              order.status !== "annulee" && (
                <button type="button" onClick={handleMarkPaid} disabled={paying} className={adminSmallButtonClassName}>
                  Marquer payée
                </button>
              )
            }
          >
            <p className="text-sm">
              {paymentMethods.find((m) => m.value === order.paymentMethod)?.label} · {paymentState(order)}
            </p>
            {order.paidAt && <p className="mt-1 text-xs text-taupe">Encaissée le {formatDateTime(order.paidAt)}</p>}
          </DetailPanel>
        </div>
      </div>
    </div>
  );
};


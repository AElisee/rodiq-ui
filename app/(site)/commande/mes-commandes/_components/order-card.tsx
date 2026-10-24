"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  orderLineKey,
  orderLineName,
  orderStatusDescription,
  orderStatusLabel,
  orderStatusMeta,
  orderTotal,
  type Order,
} from "@/lib/commandes";
import { formatPrice } from "@/lib/prestations";
import { productStock } from "@/lib/produits";
import { useCartStore } from "@/lib/stores/cart-store";
import { useShopProducts } from "@/lib/stores/catalog-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
    <dt className="text-taupe">{label}</dt>
    <dd className="sm:text-right">{children}</dd>
  </div>
);

export const OrderCard = ({ order }: { order: Order }) => {
  const router = useRouter();
  const addToCart = useCartStore((s) => s.add);
  const shopProducts = useShopProducts();
  const salonAddress = useSettingsStore((s) => s.salon.address);

  const { delivery } = order;
  const pickup = delivery.mode === "retrait";
  const status = orderStatusMeta[order.status];
  // « Nouvelle » est le libellé de l'admin : côté site, la commande est « Reçue »
  const label = order.status === "en_attente" ? "Reçue" : orderStatusLabel(order);

  // Produits (et déclinaisons) de la commande encore en stock en boutique
  const available = order.lines.flatMap((line) => {
    const product = shopProducts.find((p) => p.id === line.productId);
    // Déclinaison supprimée, ou déclinaisons ajoutées depuis la commande
    if (!product || !!product.variants?.length !== !!line.variantId) return [];
    const stock = productStock(product, line.variantId);
    return stock > 0 ? [{ line, stock }] : [];
  });

  // Remet au panier les produits encore disponibles, au prix actuel du catalogue
  const orderAgain = () => {
    available.forEach(({ line, stock }) => addToCart(line.productId, line.variantId, line.quantity, stock));
    if (available.length < order.lines.length) {
      toast("Certains produits ne sont plus disponibles", {
        description: "Seuls les produits encore en boutique ont été ajoutés au panier.",
      });
    }
    router.push("/panier");
  };

  const payment =
    order.paymentMethod === "mobile_money"
      ? "Mobile Money"
      : pickup
        ? "Espèces au retrait"
        : "Espèces à la livraison";

  return (
    <article className="rounded-[var(--radius)] border border-sand p-6 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-[clamp(1.15rem,1.6vw,1.4rem)] text-cocoa first-letter:uppercase">
            {format(new Date(order.createdAt), "EEEE d MMMM yyyy", { locale: fr })}
          </h2>
          <p className="mt-1 font-sans text-sm text-taupe">Réf. {order.reference}</p>
        </div>
        <span className={cn("rounded-full px-4 py-1 font-sans text-sm", status.badgeClassName)}>
          {label}
        </span>
      </header>

      <ul className="mt-6 flex flex-col gap-2 border-t border-sand pt-6 font-sans text-sm text-cocoa">
        {order.lines.map((line) => (
          <li key={orderLineKey(line)} className="flex justify-between gap-4">
            <span>
              {orderLineName(line)}
              <span className="text-taupe"> × {line.quantity}</span>
            </span>
            <span className="whitespace-nowrap">{formatPrice(line.unitPrice * line.quantity)}</span>
          </li>
        ))}
        {order.deliveryFee > 0 && (
          <li className="flex justify-between gap-4 text-taupe">
            <span>Livraison</span>
            <span className="whitespace-nowrap">{formatPrice(order.deliveryFee)}</span>
          </li>
        )}
        <li className="flex justify-between gap-4 pt-2 font-serif text-base">
          <span>Total</span>
          <span className="font-sans">{formatPrice(orderTotal(order))}</span>
        </li>
      </ul>

      <dl className="mt-6 flex flex-col gap-4 border-t border-sand pt-6 font-sans text-sm text-cocoa">
        <Row label={pickup ? "Retrait" : "Livraison"}>
          {pickup ? `Au salon · ${salonAddress}` : delivery.address}
        </Row>
        <Row label="Paiement">
          {payment}
          {order.status !== "annulee" && (
            <span className="text-taupe"> · {order.paid ? "réglé" : "à régler"}</span>
          )}
        </Row>
      </dl>

      <div className="mt-6 border-t border-sand pt-6 font-sans text-sm">
        <p className="text-taupe">{orderStatusDescription(order)}</p>

        {order.status === "annulee" && order.cancellationReason && (
          <p className="mt-3 rounded-[var(--radius)] bg-sand px-5 py-4 text-cocoa">
            <span className="block font-serif text-base">Motif</span>
            {order.cancellationReason}
          </p>
        )}

        {(order.status === "livree" || order.status === "annulee") && available.length > 0 && (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={orderAgain}
              className="inline-flex h-11 items-center justify-center rounded-full bg-blush px-6 font-sans text-base text-cocoa transition-colors hover:bg-sand"
            >
              Commander à nouveau
            </button>
          </div>
        )}
      </div>
    </article>
  );
};

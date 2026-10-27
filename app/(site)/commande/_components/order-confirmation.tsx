"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { orderDeliveryAddress, orderLineKey, orderLineName, orderTotal, type Order } from "@/lib/commandes";
import { formatPrice } from "@/lib/prestations";
import { useSettingsStore } from "@/lib/stores/settings-store";

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
    <dt className="text-taupe">{label}</dt>
    <dd className="sm:text-right">{children}</dd>
  </div>
);

// Écran affiché une fois la commande envoyée
export const OrderConfirmation = ({ order }: { order: Order }) => {
  const salonAddress = useSettingsStore((s) => s.salon.address);
  const { customer, delivery } = order;
  const pickup = delivery.mode === "retrait";

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
      <p className="font-serif text-[clamp(1.5rem,2.5vw,2.25rem)] leading-tight text-cocoa">
        Merci {customer.firstName}, votre commande est bien enregistrée.
      </p>
      <p className="mt-4 font-serif text-[clamp(1rem,1.3vw,1.15rem)] text-taupe italic">
        {order.paymentMethod === "mobile_money"
          ? `Nous vous envoyons la demande de paiement Mobile Money au ${customer.phone}, puis nous préparons votre colis.`
          : `Nous vous appelons au ${customer.phone} pour confirmer, puis nous préparons votre colis.`}
      </p>

      <div className="mt-10 w-full rounded-[var(--radius)] border border-sand p-6 text-left md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand pb-6">
          <div>
            <p className="font-sans text-sm text-taupe">Référence</p>
            <p className="font-sans text-xl tracking-wider text-cocoa">{order.reference}</p>
          </div>
          <span className="rounded-full bg-sand px-4 py-1 font-sans text-sm text-cocoa">
            Reçue
          </span>
        </div>

        <ul className="mt-6 flex flex-col gap-2 border-b border-sand pb-6 font-sans text-sm text-cocoa">
          {order.lines.map((line) => (
            <li key={orderLineKey(line)} className="flex justify-between gap-4">
              <span>
                {orderLineName(line)}
                <span className="text-taupe"> × {line.quantity}</span>
              </span>
              <span className="whitespace-nowrap">{formatPrice(line.unitPrice * line.quantity)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-6 flex flex-col gap-4 font-sans text-sm text-cocoa">
          <Row label={pickup ? "Retrait" : "Livraison"}>
            {pickup ? `Au salon · ${salonAddress}` : orderDeliveryAddress(order)}
          </Row>
          <Row label="Paiement">
            {order.paymentMethod === "mobile_money" ? "Mobile Money" : pickup ? "Espèces au retrait" : "Espèces à la livraison"}
          </Row>
          <Row label="Total">
            <span className="font-serif text-lg">{formatPrice(orderTotal(order))}</span>
          </Row>
        </dl>
      </div>

      <p className="mt-6 font-sans text-sm text-taupe">
        Conservez votre référence : elle vous sera demandée pour toute question sur votre commande.
      </p>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/commande/mes-commandes"
          className="inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Suivre ma commande
        </Link>
        <Link href="/boutique" className="font-sans text-sm text-cocoa underline-offset-4 hover:underline">
          retour à la boutique
        </Link>
      </div>
    </div>
  );
};

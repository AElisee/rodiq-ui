"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { FieldError, inputClassName, labelClassName, Required, submitClassName } from "@/components/forms/form-fields";
import { ProductVisual } from "@/components/shop/product-visual";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorMessage } from "@/lib/api/client";
import { deliveryFeeFor, type Order } from "@/lib/commandes";
import { formatPrice } from "@/lib/prestations";
import { selectCurrentAccount, useAuthHydrated, useAuthStore } from "@/lib/stores/auth-store";
import { resolveCartLines, useCartHydrated, useCartStore } from "@/lib/stores/cart-store";
import { useShopProductsById } from "@/lib/stores/shop-store";
import { useOrderStore } from "@/lib/stores/order-store";
import { useSettingsHydrated, useSettingsStore } from "@/lib/stores/settings-store";
import { textSchema } from "@/lib/validation";
import { OrderConfirmation } from "./order-confirmation";
import { FlowSkeleton } from "@/components/layout/site-skeleton";
import { PendingLabel } from "@/components/ui/shimmer";

const checkoutSchema = z
  .object({
    mode: z.enum(["livraison", "retrait"]),
    commune: z.string(),
    address: z.string().trim().max(200, "200 caractères maximum"),
    paymentMethod: z.enum(["mobile_money", "especes"]),
    note: textSchema(0, "", "Entrer un texte correct").max(500, "500 caractères maximum"),
  })
  .superRefine((values, ctx) => {
    if (values.mode !== "livraison") return;
    if (!values.commune) ctx.addIssue({ code: "custom", path: ["commune"], message: "Choisissez votre destination" });
    if (values.address.length < 5)
      ctx.addIssue({ code: "custom", path: ["address"], message: "Indiquez une adresse ou un repère précis" });
  });

type CheckoutValues = z.infer<typeof checkoutSchema>;

const REDIRECT = encodeURIComponent("/commande");

const optionClassName =
  "flex cursor-pointer flex-col gap-1 rounded-[var(--radius)] border border-sand p-5 font-sans text-cocoa transition-colors hover:bg-sand has-checked:border-cocoa has-checked:bg-sand has-focus-visible:border-taupe";

const Step = ({ number, title, children }: { number: number; title: string; children: ReactNode }) => (
  <section aria-labelledby={`step-${number}`} className="border-b border-sand pb-12">
    <h2
      id={`step-${number}`}
      className="flex items-baseline gap-4 font-serif text-[clamp(1.4rem,2vw,1.75rem)] text-cocoa"
    >
      <span className="font-sans text-sm text-taupe">0{number}</span>
      {title}
    </h2>
    <div className="mt-8">{children}</div>
  </section>
);

// Tunnel de commande de la boutique : compte, remise (livraison ou retrait), paiement, puis récapitulatif.
// Commander exige un compte : les coordonnées viennent du compte, prix et frais sont recalculés par l'API
export const CheckoutFlow = () => {
  const cartHydrated = useCartHydrated();
  const authHydrated = useAuthHydrated();
  const settingsHydrated = useSettingsHydrated();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const { products, pending: productsPending, error: productsError, retry: retryProducts } = useShopProductsById(
    items.map((item) => item.id),
  );
  const addOrder = useOrderStore((s) => s.add);
  const account = useAuthStore(selectCurrentAccount);
  const signOut = useAuthStore((s) => s.signOut);
  const salonAddress = useSettingsStore((s) => s.salon.address);
  const shipping = useSettingsStore((s) => s.shipping);
  const [confirmed, setConfirmed] = useState<Order>();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    // Chaque champ est vérifié dès qu'on le quitte, puis à chaque frappe
    mode: "onTouched",
    defaultValues: {
      mode: "livraison",
      commune: "",
      address: "",
      paymentMethod: "mobile_money",
      note: "",
    },
  });
  const values = useWatch({ control });

  if (confirmed) return <OrderConfirmation order={confirmed} />;

  // Le contenu dépend du navigateur (panier, session) et des produits relus depuis l'API
  if (!cartHydrated || !authHydrated || !settingsHydrated || productsPending) {
    return <FlowSkeleton className="lg:grid-cols-[1fr_380px]" />;
  }

  // Lecture des produits ratée : impossible de vérifier prix et disponibilités
  if (productsError) {
    return (
      <div role="alert" className="flex flex-col items-center py-12 text-center">
        <p className="font-serif text-[clamp(1.25rem,2vw,1.75rem)] text-cocoa">
          Les articles de votre panier n&apos;ont pas pu être chargés.
        </p>
        <p className="mt-3 max-w-md font-sans text-sm text-taupe">{productsError}</p>
        <button
          type="button"
          onClick={() => void retryProducts()}
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Ignore les produits retirés du catalogue depuis l'ajout au panier
  const lines = resolveCartLines(items, products);

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <p className="font-serif text-[clamp(1.25rem,2vw,1.75rem)] text-cocoa">Votre panier est vide.</p>
        <p className="mt-3 max-w-md font-serif text-[clamp(1rem,1.3vw,1.15rem)] text-taupe italic">
          Ajoutez des produits à votre panier pour passer commande.
        </p>
        <Link
          href="/boutique"
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-blush px-10 font-sans text-base text-cocoa transition-colors hover:bg-sand"
        >
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  const delivery = values.mode === "livraison";
  // Articles épuisés ou demandés au-delà du stock restant
  const soldOut = lines.filter((line) => line.quantity > line.stock);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  // Communes livrées et villes desservies par expédition partagent le même choix de destination
  const rates = [...shipping.delivery, ...shipping.expedition];
  const deliveryFee = delivery && values.commune ? deliveryFeeFor(rates, values.commune) : 0;
  const total = subtotal + deliveryFee;

  const filled = (value?: string) => !!value?.trim();
  // Ce qu'il reste à compléter avant de pouvoir valider la commande
  const missing = [
    !account && "la connexion à votre compte",
    delivery && !(filled(values.commune) && filled(values.address)) && "l'adresse de livraison",
  ].filter(Boolean);

  const onSubmit = async (values: CheckoutValues) => {
    if (soldOut.length > 0 || !account) return;
    const pickup = values.mode === "retrait";

    try {
      const order = await addOrder({
        lines: lines.map(({ product, variant, quantity }) => ({ productId: product.id, variantId: variant?.id, quantity })),
        mode: values.mode,
        commune: pickup ? undefined : values.commune,
        address: pickup ? undefined : values.address,
        paymentMethod: values.paymentMethod,
        // Total affiché : refusé par l'API si un prix ou un frais a changé entre-temps
        expectedTotal: total,
        note: values.note.trim() || undefined,
      });
      clearCart();
      setConfirmed(order);
      window.scrollTo({ top: 0 });
    } catch (error) {
      // Les produits sont relus par le store : le récapitulatif montre les prix et quantités à jour
      toast.error("Votre commande n'a pas été passée", { description: errorMessage(error) });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-16"
    >
      <div className="flex flex-col gap-12">
        <Step number={1} title="Vos coordonnées">
          {account ? (
            <div className="rounded-[var(--radius)] bg-sand px-5 py-4 font-sans text-sm text-cocoa">
              <p>
                {account.firstName} {account.lastName} · {account.phone} · {account.email}
              </p>
              <p className="mt-2 text-taupe">
                Coordonnées de votre compte, transmises au salon avec la commande.{" "}
                <button type="button" onClick={signOut} className="text-cocoa underline underline-offset-4">
                  Ce n&apos;est pas vous ?
                </button>
              </p>
            </div>
          ) : (
            <div className="rounded-[var(--radius)] border border-sand px-5 py-4 font-sans text-sm text-cocoa">
              <p>Un compte est nécessaire pour commander et suivre votre commande.</p>
              <p className="mt-2">
                <Link href={`/connexion?redirect=${REDIRECT}`} className="underline underline-offset-4">
                  Connectez-vous
                </Link>{" "}
                ou{" "}
                <Link href={`/inscription?redirect=${REDIRECT}`} className="underline underline-offset-4">
                  créez votre compte
                </Link>
                , votre panier vous attend.
              </p>
            </div>
          )}
          <p className="mt-6 font-sans text-sm text-taupe">* champs obligatoires</p>
        </Step>

        <Step number={2} title="Livraison ou retrait">
          <fieldset>
            <legend className="sr-only">Mode de remise</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={optionClassName}>
                <input type="radio" value="livraison" className="sr-only" {...register("mode")} />
                <span className="text-base">Livraison à domicile</span>
                <span className="text-sm text-taupe">
                  {shipping.expedition.length > 0
                    ? "À Abidjan ou par expédition dans le reste du pays, frais selon la destination."
                    : "À Abidjan et environs, frais selon la commune."}
                </span>
              </label>
              <label className={optionClassName}>
                <input type="radio" value="retrait" className="sr-only" {...register("mode")} />
                <span className="text-base">Retrait au salon</span>
                <span className="text-sm text-taupe">Gratuit · {salonAddress}</span>
              </label>
            </div>
          </fieldset>

          {delivery && (
            <div className="mt-8 grid gap-6 sm:grid-cols-[minmax(0,14rem)_1fr]">
              <div>
                <label htmlFor="commune" className={labelClassName}>
                  {shipping.expedition.length > 0 ? "Commune ou ville" : "Commune"}<Required />
                </label>
                <Controller
                  control={control}
                  name="commune"
                  render={({ field, fieldState }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="commune"
                        aria-required
                        aria-invalid={!!fieldState.error}
                        onBlur={field.onBlur}
                        className="h-12 w-full justify-between rounded-full border-sand bg-pearl px-5 font-sans text-base text-cocoa data-[size=default]:h-12 aria-invalid:border-destructive [&>svg]:size-5"
                      >
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        className="bg-pearl font-sans text-cocoa [&_[data-slot=select-item]]:py-2 [&_[data-slot=select-item]]:text-base"
                      >
                        {(
                          [
                            ["Livraison à Abidjan", shipping.delivery],
                            ["Expédition", shipping.expedition],
                          ] as const
                        ).map(
                          ([label, group]) =>
                            group.length > 0 && (
                              <SelectGroup key={label}>
                                <SelectLabel className="font-sans text-xs text-taupe">{label}</SelectLabel>
                                {group.map((rate) => (
                                  <SelectItem key={rate.place} value={rate.place}>
                                    {rate.place} · {formatPrice(rate.fee)}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ),
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.commune?.message} />
              </div>
              <div>
                <label htmlFor="address" className={labelClassName}>
                  Adresse ou repère<Required />
                </label>
                <input
                  id="address"
                  autoComplete="street-address"
                  placeholder="Quartier, rue, immeuble, repère…"
                  aria-required
                  aria-invalid={!!errors.address}
                  className={inputClassName}
                  {...register("address")}
                />
                <FieldError message={errors.address?.message} />
              </div>
            </div>
          )}
        </Step>

        <Step number={3} title="Paiement">
          <fieldset>
            <legend className="sr-only">Moyen de paiement</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={optionClassName}>
                <input type="radio" value="mobile_money" className="sr-only" {...register("paymentMethod")} />
                <span className="text-base">Mobile Money</span>
                <span className="text-sm text-taupe">
                  Orange Money, MTN, Moov ou Wave : la demande de paiement est envoyée sur votre téléphone.
                </span>
              </label>
              <label className={optionClassName}>
                <input type="radio" value="especes" className="sr-only" {...register("paymentMethod")} />
                <span className="text-base">Espèces</span>
                <span className="text-sm text-taupe">
                  À régler {delivery ? "au livreur, à la réception du colis" : "au salon, lors du retrait"}.
                </span>
              </label>
            </div>
          </fieldset>

          <div className="mt-8">
            <label htmlFor="note" className={labelClassName}>
              Une précision ?
            </label>
            <textarea
              id="note"
              rows={3}
              placeholder="Horaires de disponibilité, paquet cadeau…"
              aria-invalid={!!errors.note}
              className="w-full rounded-[var(--radius)] border border-sand bg-pearl px-5 py-3 font-sans text-base text-cocoa outline-none transition-colors placeholder:text-taupe focus-visible:border-taupe aria-invalid:border-destructive"
              {...register("note")}
            />
            <FieldError message={errors.note?.message} />
          </div>
        </Step>
      </div>

      {/* Récapitulatif : reste visible pendant le défilement sur grand écran */}
      <aside
        aria-label="Récapitulatif de la commande"
        className="rounded-[var(--radius)] border border-sand p-6 md:p-8 lg:sticky lg:top-32"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-[clamp(1.4rem,2vw,1.75rem)] text-cocoa">Récapitulatif</h2>
          <Link href="/panier" className="font-sans text-sm text-cocoa underline-offset-4 hover:underline">
            modifier
          </Link>
        </div>

        <ul className="mt-6 flex flex-col gap-4 border-b border-sand pb-6">
          {lines.map(({ key, product, variant, quantity, stock }) => (
            <li key={key} className="flex gap-4">
              <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-[var(--radius)] bg-sand">
                <ProductVisual product={product} sizes="56px" iconClassName="size-5" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center font-sans text-sm text-cocoa">
                <p className="truncate">{product.name}</p>
                <p className="text-xs text-taupe">
                  {variant && `${variant.name} · `}
                  {stock <= 0 ? "épuisé" : quantity > stock ? `plus que ${stock} en stock` : `Quantité : ${quantity}`}
                </p>
              </div>
              <p className="self-center font-sans text-sm whitespace-nowrap text-cocoa">
                {formatPrice(product.price * quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-6 flex flex-col gap-3 border-b border-sand pb-6 font-sans text-sm text-cocoa">
          <div className="flex justify-between gap-4">
            <dt>
              Sous-total ({count} article{count > 1 && "s"})
            </dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Livraison</dt>
            <dd className={delivery && !values.commune ? "text-taupe" : undefined}>
              {!delivery ? "Gratuite" : values.commune ? formatPrice(deliveryFee) : "selon la destination"}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex items-baseline justify-between gap-4 text-cocoa">
          <p className="font-serif text-lg">Total</p>
          <p className="font-sans text-lg">{formatPrice(total)}</p>
        </div>

        <button
          type="submit"
          disabled={soldOut.length > 0 || missing.length > 0 || isSubmitting}
          aria-describedby="submit-hint"
          className={`mt-8 ${submitClassName}`}
        >
          <PendingLabel pending={isSubmitting} pendingLabel="Envoi de la commande…">Valider ma commande</PendingLabel>
        </button>
        <p id="submit-hint" className="mt-4 text-center font-sans text-sm text-taupe">
          {soldOut.length > 0
            ? "Certains produits ne sont plus disponibles en quantité suffisante : modifiez votre panier pour continuer."
            : missing.length > 0
            ? `Pour valider votre commande, complétez : ${missing.join(", ")}.`
            : "Nous vous contactons pour confirmer la commande et la remise."}
        </p>
      </aside>
    </form>
  );
};

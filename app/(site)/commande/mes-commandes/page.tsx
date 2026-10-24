import type { Metadata } from "next";
import Image from "next/image";
import { AccountBanner } from "@/components/layout/account-banner";
import bannerImage from "@/public/images/boutique.jpg";
import { OrderHistory } from "./_components/order-history";

export const metadata: Metadata = {
  title: "Mes commandes",
  description: "Suivez vos commandes de la boutique RODIQ : statut, livraison ou retrait, et historique.",
};

const MesCommandesPage = () => (
  <>
    {/* Bandeau image : fond sombre pour garder le header transparent lisible */}
    <section className="relative flex h-[45svh] min-h-[340px] w-full items-end justify-center overflow-hidden">
      <Image
        src={bannerImage}
        alt="Flacons de sérums de soin à pipette posés sur un fond rose poudré"
        fill
        preload
        placeholder="blur"
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-cocoa/25" aria-hidden />

      <h1 className="relative z-10 px-4 pb-12 text-center font-serif text-[clamp(2.25rem,5vw,5rem)] leading-tight font-normal text-balance text-pearl md:pb-16">
        Mes commandes
      </h1>
    </section>

    <section className="w-full bg-pearl px-4 py-16 md:px-8 md:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-4xl">
        <AccountBanner redirect="/commande/mes-commandes" subject="commandes" />
        <OrderHistory />
      </div>
    </section>
  </>
);

export default MesCommandesPage;

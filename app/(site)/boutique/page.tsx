import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import bannerImage from "@/public/images/boutique.jpg";
import { ShopCatalog } from "./_components/shop-catalog";
import { ProductGridSkeleton } from "@/components/layout/site-skeleton";

export const metadata: Metadata = {
  title: "Boutique",
  description:
    "Vernis, soins des ongles, des mains et des pieds : prolongez chez vous le soin RODIQ.",
};

const BoutiquePage = () => (
  <>
    {/* Bandeau image : fond sombre pour garder le header transparent lisible */}
    <section className="relative flex h-[60svh] min-h-[420px] w-full items-end justify-center overflow-hidden">
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

      <h1 className="relative z-10 px-4 pb-16 text-center font-serif text-[clamp(2.25rem,5vw,5rem)] leading-tight font-normal text-balance text-pearl md:pb-24">
        La boutique
      </h1>
    </section>

    <section className="w-full bg-pearl px-4 py-16 md:px-8 md:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-6xl">
        <p className="mx-auto max-w-xl text-center font-serif text-[clamp(1rem,1.3vw,1.25rem)] leading-relaxed text-cocoa">
          Des produits sélectionnés pour prendre soin de vos ongles, de vos mains et de vos
          pieds entre deux rendez-vous.
        </p>

        {/* Suspense : la catégorie de départ se lit dans l'URL (?categorie=…) */}
        <Suspense fallback={<ProductGridSkeleton className="mt-10 md:mt-12" />}>
          <ShopCatalog />
        </Suspense>
      </div>
    </section>
  </>
);

export default BoutiquePage;

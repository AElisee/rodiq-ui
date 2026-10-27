import type { Metadata } from "next";
import Image from "next/image";
import bannerImage from "@/public/images/boutique.jpg";
import { ProductDetail } from "./_components/product-detail";
import { RelatedProducts } from "./_components/related-products";

export const metadata: Metadata = {
  title: "Boutique",
};

// Produits gérés depuis l'admin et lus depuis l'API par le navigateur : rendu à la demande
export const instant = false;

const ProductPage = async ({ params }: PageProps<"/boutique/[id]">) => {
  const { id } = await params;

  return (
    <>
      {/* Bandeau image : fond sombre pour garder le header transparent lisible */}
      <section className="relative flex h-[35svh] min-h-[280px] w-full items-end justify-center overflow-hidden">
        <Image
          src={bannerImage}
          alt=""
          fill
          preload
          placeholder="blur"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-cocoa/25" aria-hidden />

        <p className="relative z-10 px-4 pb-10 text-center font-serif text-[clamp(1.75rem,3.5vw,3.5rem)] leading-tight text-balance text-pearl md:pb-14">
          La boutique
        </p>
      </section>

      <section className="w-full bg-pearl px-4 py-12 md:px-8 md:py-16 lg:py-20">
        <div className="mx-auto w-full max-w-6xl">
          {/* Nom, prix, déclinaisons et disponibilité lus depuis l'API : rendu côté navigateur */}
          <ProductDetail id={id} />
        </div>
      </section>

      <RelatedProducts id={id} />
    </>
  );
};

export default ProductPage;

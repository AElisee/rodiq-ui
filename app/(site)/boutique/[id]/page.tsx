import type { Metadata } from "next";
import Image from "next/image";
import bannerImage from "@/public/images/boutique.jpg";
import { getCategory, getProduct, products } from "@/lib/produits";
import { ProductDetail } from "./_components/product-detail";
import { RelatedProducts } from "./_components/related-products";

// Fiches du catalogue générées au build ; les produits ajoutés depuis l'admin sont lus dans le navigateur
export const generateStaticParams = () => products.map((product) => ({ id: product.id }));

export const generateMetadata = async ({
  params,
}: PageProps<"/boutique/[id]">): Promise<Metadata> => {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) return { title: "Boutique" };

  return {
    title: product.name,
    description: product.description ?? getCategory(product.categoryId)?.description,
  };
};

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
          {/* Nom, prix, déclinaisons et stock modifiables depuis l'admin : rendu côté navigateur */}
          <ProductDetail id={id} />
        </div>
      </section>

      <RelatedProducts id={id} />
    </>
  );
};

export default ProductPage;

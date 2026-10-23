import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import bannerImage from "@/public/images/boutique.jpg";
import { getCategory, getProduct, getRelatedProducts, products } from "@/lib/produits";
import { ProductDetail } from "./_components/product-detail";
import { RelatedProducts } from "./_components/related-products";

// Catalogue statique : toutes les fiches sont générées au build (id inconnu → notFound)
export const generateStaticParams = () => products.map((product) => ({ id: product.id }));

export const generateMetadata = async ({
  params,
}: PageProps<"/boutique/[id]">): Promise<Metadata> => {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) return {};

  return {
    title: product.name,
    description: product.description ?? getCategory(product.categoryId)?.description,
  };
};

const ProductPage = async ({ params }: PageProps<"/boutique/[id]">) => {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  const category = getCategory(product.categoryId);
  const related = getRelatedProducts(product);

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
          <nav aria-label="Fil d'Ariane">
            <ol className="flex flex-wrap items-center gap-2 font-sans text-sm text-taupe">
              <li>
                <Link href="/boutique" className="underline-offset-4 hover:text-cocoa hover:underline">
                  Boutique
                </Link>
              </li>
              {category && (
                <li className="flex items-center gap-2">
                  <ChevronRight className="size-3.5" strokeWidth={1.75} aria-hidden />
                  {category.name}
                </li>
              )}
              <li aria-current="page" className="flex items-center gap-2 text-cocoa">
                <ChevronRight className="size-3.5" strokeWidth={1.75} aria-hidden />
                {product.name}
              </li>
            </ol>
          </nav>

          {/* Nom, prix et disponibilité modifiables depuis l'admin : rendu côté navigateur */}
          <ProductDetail product={product} category={category} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="w-full border-t border-sand bg-pearl px-4 py-16 md:px-8 md:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="text-center font-serif text-[clamp(1.75rem,3vw,2.5rem)] text-cocoa">
              Vous aimerez aussi
            </h2>

            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
              <RelatedProducts products={related} />
            </ul>
          </div>
        </section>
      )}
    </>
  );
};

export default ProductPage;

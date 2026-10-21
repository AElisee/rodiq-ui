import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
// Photo provisoire : à remplacer par la photo de la cliente avec la Bible (public/images/histoire.jpg)
import storyImage from "@/public/images/hero.jpg";

export const metadata: Metadata = {
  title: "Notre histoire",
  description:
    "RODIQ est née d'une conviction : la beauté n'est pas seulement ce que l'on voit, mais ce que l'on porte, ce que l'on soigne et la manière dont on avance.",
};

const HistoirePage = () => (
  <>
    {/* Bandeau image : fond sombre pour garder le header transparent lisible */}
    <section className="relative flex h-[70svh] min-h-[480px] w-full items-end justify-center overflow-hidden">
      <Image
        src={storyImage}
        alt="Cliente de RODIQ de dos, cheveux ondulés"
        fill
        preload
        placeholder="blur"
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-cocoa/25" aria-hidden />

      <h1 className="relative z-10 px-4 pb-16 text-center font-serif text-[clamp(2.25rem,5vw,5rem)] leading-tight font-normal text-balance text-pearl md:pb-24">
        L&apos;histoire de RODIQ
      </h1>
    </section>

    {/* Récit */}
    <section className="w-full bg-pearl px-4 py-20 md:px-8 md:py-24 lg:py-28">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 font-serif text-[clamp(1rem,1.3vw,1.25rem)] leading-relaxed text-cocoa">
        <p>
          RODIQ est née d&apos;une conviction : la beauté n&apos;est pas seulement ce que
          l&apos;on voit, mais ce que l&apos;on porte, ce que l&apos;on soigne et la manière
          dont on avance.
        </p>

        <figure className="my-4 border-y border-sand py-10 text-center">
          <figcaption className="font-sans text-sm tracking-[0.2em] text-taupe uppercase">
            Inspirée par Romains 10:15
          </figcaption>
          <blockquote className="mt-6 text-[clamp(1.4rem,2.2vw,2rem)] leading-snug text-balance italic">
            « Qu&apos;ils sont beaux les pieds de ceux qui annoncent de bonnes nouvelles. »
          </blockquote>
        </figure>

        <p>
          RODIQ est bien plus qu&apos;une onglerie, c&apos;est une maison de beauté, de soin
          et de foi.
        </p>
        <p>
          Un lieu où chaque femme peut se recentrer, prendre soin d&apos;elle, se sentir belle
          et repartir avec confiance, prête à avancer dans sa destinée.
        </p>

        <Link
          href="/reserver"
          className="mt-8 inline-flex h-16 items-center justify-center self-center rounded-full bg-blush px-12 font-sans text-lg text-cocoa transition-colors hover:bg-sand"
        >
          Prendre rendez-vous
        </Link>
      </div>
    </section>
  </>
);

export default HistoirePage;

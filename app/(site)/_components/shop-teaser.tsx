import Image from "next/image";
import Link from "next/link";
import shopImage from "@/public/images/boutique.jpg";

// Invitation vers la boutique : photo des produits en plein cadre, encart centré par-dessus
export const ShopTeaser = () => (
  <section className="w-full bg-pearl px-4 pb-20 md:px-8 md:pb-24 lg:pb-28">
    <div className="relative mx-auto flex h-[min(80svh,760px)] min-h-[460px] w-full max-w-7xl items-center justify-center overflow-hidden rounded-[var(--radius)] bg-sand">
      <Image
        src={shopImage}
        alt="Flacons de sérums de soin à pipette posés sur un fond rose poudré"
        fill
        placeholder="blur"
        sizes="(min-width: 1280px) 1280px, 100vw"
        className="object-cover"
      />

      <div className="relative z-10 flex max-w-sm flex-col items-center rounded-[var(--radius)] bg-pearl px-8 py-8 text-center md:max-w-md md:px-12 md:py-10">
        <p className="font-serif text-[clamp(1.4rem,2.2vw,2rem)] leading-snug text-balance text-cocoa">
          Prolongez le soin chez vous
        </p>
        <Link
          href="/boutique"
          className="mt-8 inline-flex h-16 items-center justify-center rounded-full bg-blush px-12 font-sans text-lg text-cocoa transition-colors hover:bg-sand"
        >
          découvrir la boutique
        </Link>
      </div>
    </div>
  </section>
);

import type { Metadata } from "next";
import Image from "next/image";
import { formatPrice, prestationCategories } from "@/lib/prestations";
import bannerImage from "@/public/images/prestation-hands.jpg";
import { BookingBar } from "./_components/booking-bar";
import { ReserveButton } from "./_components/reserve-button";

export const metadata: Metadata = {
  title: "Prestations",
  description:
    "Manucure, pédicure, pose, vernis permanent, soin des pieds, tresses et maquillage : découvrez les prestations et tarifs RODIQ.",
};

const PrestationsPage = () => (
  <>
    {/* Bandeau image : fond sombre pour garder le header transparent lisible */}
    <section className="relative flex h-[60svh] min-h-[420px] w-full items-end justify-center overflow-hidden">
      <Image
        src={bannerImage}
        alt="Main aux ongles courts et naturels, vernis nude, portant une fine bague dorée"
        fill
        preload
        placeholder="blur"
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-cocoa/25" aria-hidden />

      <h1 className="relative z-10 px-4 pb-16 text-center font-serif text-[clamp(2.25rem,5vw,5rem)] leading-tight font-normal text-balance text-pearl md:pb-24">
        Nos prestations
      </h1>
    </section>

    <section className="w-full bg-pearl px-4 py-16 md:px-8 md:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-4xl">
        <p className="mx-auto max-w-xl text-center font-serif text-[clamp(1rem,1.3vw,1.25rem)] leading-relaxed text-cocoa">
          Choisissez une ou plusieurs prestations, puis continuez vers la réservation pour
          sélectionner votre créneau.
        </p>

        {/* Accès rapide aux catégories */}
        <nav aria-label="Catégories de prestations" className="mt-10 flex flex-wrap justify-center gap-3">
          {prestationCategories.map((category) => (
            <a
              key={category.id}
              href={`#${category.id}`}
              className="rounded-full border border-sand px-5 py-2 font-sans text-sm text-cocoa transition-colors hover:bg-sand"
            >
              {category.name}
            </a>
          ))}
        </nav>

        <div className="mt-16 flex flex-col gap-20 md:mt-20 md:gap-24">
          {prestationCategories.map((category) => (
            <section key={category.id} id={category.id} className="scroll-mt-32" aria-labelledby={`${category.id}-title`}>
              <header className="border-b border-sand pb-6">
                <h2
                  id={`${category.id}-title`}
                  className="font-serif text-[clamp(1.75rem,2.8vw,2.75rem)] leading-tight font-normal text-cocoa"
                >
                  {category.name}
                </h2>
                <p className="mt-2 font-serif text-[clamp(1.05rem,1.4vw,1.3rem)] text-taupe italic">
                  {category.tagline}
                </p>
              </header>

              <ul className="divide-y divide-sand">
                {category.prestations.map((prestation) => (
                  <li
                    key={prestation.id}
                    className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
                  >
                    <div className="min-w-0">
                      <h3 className="font-serif text-[clamp(1.1rem,1.5vw,1.35rem)] text-cocoa">
                        {prestation.name}
                      </h3>
                      {prestation.note && (
                        <p className="mt-1 font-sans text-sm text-taupe">{prestation.note}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:justify-end">
                      <p className="font-sans text-base whitespace-nowrap text-cocoa">
                        {formatPrice(prestation.price, prestation.fromPrice)}
                      </p>
                      <ReserveButton id={prestation.id} name={prestation.name} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>

    <BookingBar />
  </>
);

export default PrestationsPage;

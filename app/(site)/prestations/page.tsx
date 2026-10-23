import type { Metadata } from "next";
import Image from "next/image";
import bannerImage from "@/public/images/prestation-hands.jpg";
import { BookingBar } from "./_components/booking-bar";
import { PrestationList } from "./_components/prestation-list";

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

        {/* Accès rapide aux catégories et grille tarifaire (modifiable depuis l'admin) */}
        <PrestationList />
      </div>
    </section>

    <BookingBar />
  </>
);

export default PrestationsPage;

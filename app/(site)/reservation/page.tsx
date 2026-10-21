import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import bannerImage from "@/public/images/prestation-feet.jpg";
import { BookingFlow } from "./_components/booking-flow";

export const metadata: Metadata = {
  title: "Réservation",
  description:
    "Réservez votre soin RODIQ en quelques instants : choisissez vos prestations, votre créneau et laissez-nous vos coordonnées.",
};

const ReservationPage = () => (
  <>
    {/* Bandeau image : fond sombre pour garder le header transparent lisible */}
    <section className="relative flex h-[45svh] min-h-[340px] w-full items-end justify-center overflow-hidden">
      <Image
        src={bannerImage}
        alt="Pieds plongés dans un bain d'eau claire parsemé de fleurs d'orchidée et de frangipanier"
        fill
        preload
        placeholder="blur"
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-cocoa/25" aria-hidden />

      <h1 className="relative z-10 px-4 pb-12 text-center font-serif text-[clamp(2.25rem,5vw,5rem)] leading-tight font-normal text-balance text-pearl md:pb-16">
        Réserver un soin
      </h1>
    </section>

    <section className="w-full bg-pearl px-4 py-16 md:px-8 md:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-6xl">
        <p className="text-center font-sans text-sm text-taupe">
          Déjà réservé ?{" "}
          <Link
            href="/reservation/mes-reservations"
            className="text-cocoa underline underline-offset-4"
          >
            Consulter mes réservations
          </Link>
        </p>

        <BookingFlow />
      </div>
    </section>
  </>
);

export default ReservationPage;

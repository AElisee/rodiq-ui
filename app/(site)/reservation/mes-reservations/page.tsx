import type { Metadata } from "next";
import Image from "next/image";
import bannerImage from "@/public/images/ongle-naturel.jpg";
import { AccountBanner } from "@/components/layout/account-banner";
import { ReservationHistory } from "./_components/reservation-history";

export const metadata: Metadata = {
  title: "Mes réservations",
  description: "Suivez vos réservations RODIQ : statut, rendez-vous à venir et historique de vos soins.",
};

const MesReservationsPage = () => (
  <>
    {/* Bandeau image : fond sombre pour garder le header transparent lisible */}
    <section className="relative flex h-[45svh] min-h-[340px] w-full items-end justify-center overflow-hidden">
      <Image
        src={bannerImage}
        alt="Main aux ongles longs et carrés, vernis nude brillant, posée sur une fourrure blanche"
        fill
        preload
        placeholder="blur"
        sizes="100vw"
        className="object-cover object-[center_70%]"
      />
      <div className="absolute inset-0 bg-cocoa/25" aria-hidden />

      <h1 className="relative z-10 px-4 pb-12 text-center font-serif text-[clamp(2.25rem,5vw,5rem)] leading-tight font-normal text-balance text-pearl md:pb-16">
        Mes réservations
      </h1>
    </section>

    <section className="w-full bg-pearl px-4 py-16 md:px-8 md:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-4xl">
        <AccountBanner redirect="/reservation/mes-reservations" subject="réservations" />
        <ReservationHistory />
      </div>
    </section>
  </>
);

export default MesReservationsPage;

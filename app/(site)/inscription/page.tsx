import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import bannerImage from "@/public/images/prestation-repair.jpg";
import { SignUpForm } from "./_components/sign-up-form";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Créez votre compte RODIQ pour réserver plus vite et suivre vos réservations.",
};

const InscriptionPage = () => (
  <>
    {/* Bandeau image : fond sombre pour garder le header transparent lisible */}
    <section className="relative flex h-[40svh] min-h-[300px] w-full items-end justify-center overflow-hidden">
      <Image
        src={bannerImage}
        alt="Prothésiste ongulaire posant une capsule sur les ongles d'une cliente, à côté d'une lampe UV"
        fill
        preload
        placeholder="blur"
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-cocoa/25" aria-hidden />

      <h1 className="relative z-10 px-4 pb-12 text-center font-serif text-[clamp(2.25rem,5vw,5rem)] leading-tight font-normal text-balance text-pearl md:pb-16">
        Créer un compte
      </h1>
    </section>

    <section className="w-full bg-pearl px-4 py-16 md:px-8 md:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-2xl">
        {/* Le formulaire lit ?redirect= dans l'URL : rendu côté navigateur */}
        <Suspense fallback={<div className="min-h-96" aria-hidden />}>
          <SignUpForm />
        </Suspense>
      </div>
    </section>
  </>
);

export default InscriptionPage;

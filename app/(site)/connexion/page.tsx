import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import bannerImage from "@/public/images/prestation-hands.jpg";
import { LoginForm } from "./_components/login-form";
import { FormSkeleton } from "@/components/layout/site-skeleton";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre compte RODIQ pour réserver plus vite et suivre vos réservations.",
};

const ConnexionPage = () => (
  <>
    {/* Bandeau image : fond sombre pour garder le header transparent lisible */}
    <section className="relative flex h-[40svh] min-h-[300px] w-full items-end justify-center overflow-hidden">
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

      <h1 className="relative z-10 px-4 pb-12 text-center font-serif text-[clamp(2.25rem,5vw,5rem)] leading-tight font-normal text-balance text-pearl md:pb-16">
        Connexion
      </h1>
    </section>

    <section className="w-full bg-pearl px-4 py-16 md:px-8 md:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-md">
        {/* Le formulaire lit ?redirect= dans l'URL : rendu côté navigateur */}
        <Suspense fallback={<FormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  </>
);

export default ConnexionPage;

import Image from "next/image";
import Link from "next/link";
import heroImage from "@/public/images/hero.jpg";

export const Hero = () => (
  <section className="relative flex h-svh min-h-[560px] w-full items-center justify-center overflow-hidden">
    <Image
      src={heroImage}
      alt="Cliente du salon Rodiq de dos, cheveux ondulés, devant un mur rose poudré"
      fill
      preload
      placeholder="blur"
      sizes="100vw"
      className="object-cover object-center"
    />
    {/* Voile léger pour garder le texte blanc lisible */}
    <div className="absolute inset-0 bg-cocoa/25" aria-hidden />

    <div className="relative z-10 flex flex-col items-center px-4 pt-24 text-center md:pt-40">
      <h1 className="max-w-5xl font-serif text-[clamp(2.25rem,5vw,5rem)] leading-tight font-normal tracking-tight text-balance text-pearl italic">
        Des soins qui révèlent, des pas qui avancent
      </h1>
      <Link
        href="/reserver"
        className="mt-20 inline-flex h-18 items-center justify-center rounded-full bg-blush px-12 font-sans text-lg text-cocoa transition-colors hover:bg-sand md:mt-24 md:h-20"
      >
        prendre rendez-vous
      </Link>
    </div>
  </section>
);

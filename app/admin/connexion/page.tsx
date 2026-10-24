import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import { Suspense, type CSSProperties } from "react";
import ongleNaturelImage from "@/public/images/ongle-naturel.jpg";
import feetImage from "@/public/images/prestation-feet.jpg";
import handsImage from "@/public/images/prestation-hands.jpg";
import repairImage from "@/public/images/prestation-repair.jpg";
import { BrandMark } from "@/components/brand/logo";
import { AdminLoginForm } from "./_components/admin-login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

// Photos de soins posées derrière la carte : elles en sortent vers la gauche et la droite
const peekImages: { src: StaticImageData; x: string; y: string; r: string; delay: string }[] = [
  { src: handsImage, x: "-330px", y: "-110px", r: "-8deg", delay: "150ms" },
  { src: repairImage, x: "-280px", y: "130px", r: "5deg", delay: "300ms" },
  { src: ongleNaturelImage, x: "310px", y: "-130px", r: "7deg", delay: "225ms" },
  { src: feetImage, x: "340px", y: "110px", r: "-5deg", delay: "375ms" },
];

// Connexion de l'équipe du salon (pas d'inscription : les comptes admin sont créés par RODIQ)
const AdminConnexionPage = () => (
  <main className="flex min-h-svh flex-1 items-center justify-center overflow-hidden bg-sand px-4 py-16">
    <div className="relative w-full max-w-md">
      {/* Décor uniquement sur grand écran, là où il y a la place de chaque côté */}
      <div className="hidden lg:block" aria-hidden>
        {peekImages.map(({ src, x, y, r, delay }) => (
          <div
            key={src.src}
            className="peek-out absolute inset-0 m-auto h-64 w-48 overflow-hidden rounded-[var(--radius)] shadow-md"
            style={{ "--x": x, "--y": y, "--r": r, "--delay": delay } as CSSProperties}
          >
            <Image src={src} alt="" fill placeholder="blur" sizes="192px" className="object-cover" />
          </div>
        ))}
      </div>

      <div className="relative z-10 rounded-[var(--radius)] bg-pearl p-8 shadow-sm md:p-10">
        <p className="flex justify-center text-5xl text-cocoa">
          <BrandMark imageClassName="h-14 md:h-14" />
        </p>
        <p className="mt-3 text-center font-sans text-xs tracking-[0.3em] text-taupe uppercase">
          Administration
        </p>

        {/* Le formulaire lit ?redirect= dans l'URL : rendu côté navigateur */}
        <Suspense fallback={<div className="min-h-72" aria-hidden />}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  </main>
);

export default AdminConnexionPage;

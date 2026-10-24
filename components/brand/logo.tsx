"use client";

import Link from "next/link";
import { useSettingsHydrated, useSettingsStore } from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";

type Tone = "dark" | "light";

type BrandMarkProps = {
  // dark : logo foncé sur fond clair (variante « principal ») ; light : sur fond sombre (« clair »)
  tone?: Tone;
  className?: string;
  imageClassName?: string;
};

// Logo réglé dans l'admin, ou le nom de la plateforme en texte s'il n'y en a pas
export const BrandMark = ({ tone = "dark", className, imageClassName }: BrandMarkProps) => {
  useSettingsHydrated();
  const { name, logos } = useSettingsStore((s) => s.platform);
  const src = tone === "dark" ? (logos.principal ?? logos.clair) : (logos.clair ?? logos.principal);

  if (src) {
    // Data URL importée depuis l'admin : next/image n'apporte rien ici
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cn("h-10 w-auto object-contain md:h-14", imageClassName)} />;
  }
  return <span className={cn("font-serif font-normal leading-none tracking-tight", className)}>{name}</span>;
};

// Icône carrée (menu replié de l'admin), ou l'initiale du nom
export const BrandIcon = ({ className }: { className?: string }) => {
  useSettingsHydrated();
  const { name, logos } = useSettingsStore((s) => s.platform);

  if (logos.icone) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logos.icone} alt={name} className={cn("mx-auto size-10 object-contain", className)} />;
  }
  return <span className={cn("font-serif leading-none", className)}>{name.charAt(0).toUpperCase()}</span>;
};

export const Logo =({ tone, className }: { tone?: Tone; className?: string }) => {
  const name = useSettingsStore((s) => s.platform.name);
  return (
    <Link href="/" aria-label={`${name}, accueil`} className="inline-flex items-center">
      <BrandMark tone={tone} className={cn("text-4xl md:text-6xl", className)} />
    </Link>
  );
};

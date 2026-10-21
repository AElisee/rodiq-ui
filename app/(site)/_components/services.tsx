import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import feetImage from "@/public/images/prestation-feet.jpg";
import handsImage from "@/public/images/prestation-hands.jpg";
import repairImage from "@/public/images/prestation-repair.jpg";

type ServiceCategory = {
  name: string;
  tagline: string;
  description: string;
  image: StaticImageData;
  alt: string;
};

// Catégories de prestations (RODIQ Moments est volontairement exclue)
const categories: ServiceCategory[] = [
  {
    name: "RODIQ Hands",
    tagline: "Mains & manucure",
    description:
      "Manucure, soin des cuticules et pose de vernis : des mains soignées en profondeur, dans le respect de l'ongle naturel.",
    image: handsImage,
    alt: "Main aux ongles courts et naturels, vernis nude, portant une fine bague dorée",
  },
  {
    name: "RODIQ Feet",
    tagline: "Pieds & pédicure",
    description:
      "Pédicure, soin des talons et mise en beauté des ongles : un moment de détente pour des pieds doux, sains et légers.",
    image: feetImage,
    alt: "Pieds dans un bain parfumé, décoré de fleurs de frangipanier et d'orchidées",
  },
  {
    name: "RODIQ Repair",
    tagline: "Réparation & renforcement",
    description:
      "Réparation sans capsule, renforcement et accompagnement de la repousse pour redonner force et beauté aux ongles fragilisés.",
    image: repairImage,
    alt: "Prothésiste ongulaire soignant les ongles d'une cliente au salon",
  },
];

// Catégories de prestations : image et texte alternés, empilés sur mobile
export const Services = () => (
  <section className="w-full bg-pearl px-4 py-20 md:px-8 md:py-24 lg:py-28">
    <div className="mx-auto w-full max-w-6xl">
      <h2 className="text-center font-serif text-[clamp(2rem,3.6vw,3.5rem)] leading-tight font-normal text-balance text-cocoa">
        Nos prestations
      </h2>

      <div className="mt-16 flex flex-col gap-12 md:mt-20 md:gap-20 lg:gap-28">
        {categories.map(({ name, tagline, description, image, alt }, i) => (
          <Fragment key={name}>
            {i > 0 && <Separator className="bg-sand lg:hidden" />}
            <article className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
              <div
                className={cn(
                  "relative aspect-[4/5] w-full overflow-hidden bg-sand lg:aspect-auto lg:h-[min(70svh,640px)]",
                  i % 2 === 1 && "lg:order-2",
                )}
              >
                <Image
                  src={image}
                  alt={alt}
                  fill
                  placeholder="blur"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>

              <div className="max-w-md lg:justify-self-center">
                <h3 className="font-serif text-[clamp(1.75rem,2.8vw,2.75rem)] leading-tight font-normal text-cocoa">
                  {name}
                </h3>
                <p className="mt-3 font-serif text-[clamp(1.1rem,1.5vw,1.4rem)] text-taupe italic">
                  {tagline}
                </p>
                <p className="mt-8 font-serif text-[clamp(0.95rem,1.2vw,1.15rem)] leading-relaxed text-cocoa">
                  {description}
                </p>
              </div>
            </article>
          </Fragment>
        ))}
      </div>

      <div className="mt-20 flex justify-center md:mt-24">
        <Link
          href="/prestations"
          className="inline-flex h-16 items-center justify-center rounded-full bg-blush px-12 font-sans text-lg text-cocoa transition-colors hover:bg-sand md:h-18"
        >
          Menu prestations
        </Link>
      </div>
    </div>
  </section>
);

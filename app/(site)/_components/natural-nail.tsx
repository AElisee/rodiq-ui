import Image from "next/image";
import { Check } from "lucide-react";
import naturalNailImage from "@/public/images/ongle-naturel.jpg";

const commitments = [
  "Techniques de réparation sans capsule quand cela est possible",
  "Renforcement de l'ongle naturel",
  "Soins adaptés pour ongles fragilisés",
  "Accompagnement de la repousse",
  "Conseils personnalisés",
];

// Approche de l'ongle naturel : texte à gauche, image à droite sur ordinateur, empilés sur mobile
export const NaturalNail = () => (
  <section className="w-full bg-blush px-4 py-20 md:px-8 md:py-24 lg:py-28">
    <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <div className="max-w-md lg:justify-self-center">
        <h2 className="font-serif text-[clamp(2rem,3.6vw,3.5rem)] leading-tight font-normal text-balance text-cocoa">
          Notre approche de l&apos;ongle naturel
        </h2>
        <p className="mt-8 font-serif text-[clamp(0.95rem,1.2vw,1.15rem)] leading-relaxed text-cocoa">
          Chez RODIQ, nous croyons à une beauté saine, forte et durable.
        </p>
        <ul className="mt-8 flex flex-col gap-4">
          {commitments.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <Check className="mt-[0.2em] size-5 shrink-0 text-cocoa" strokeWidth={1.5} aria-hidden />
              <span className="font-serif text-[clamp(0.95rem,1.2vw,1.15rem)] leading-snug text-cocoa">
                {item}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-10 font-serif text-[clamp(1.25rem,1.8vw,1.75rem)] leading-snug text-cocoa italic">
          « Ne pas cacher. Prendre soin. »
        </p>
      </div>

      <div className="relative aspect-[4/5] w-full overflow-hidden lg:aspect-auto lg:h-[min(80svh,760px)]">
        <Image
          src={naturalNailImage}
          alt="Main aux ongles naturels soignés, vernis nude brillant, posée sur un plaid blanc"
          fill
          placeholder="blur"
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-[center_70%]"
        />
      </div>
    </div>
  </section>
);

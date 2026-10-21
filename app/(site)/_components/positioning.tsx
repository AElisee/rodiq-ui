import { Minus } from "lucide-react";

const specialties = [
  "Le soin et la beauté des mains et des pieds",
  "La réparation et le renforcement de l'ongle naturel",
  "L'utilisation de produits de qualité professionnelle",
  "Une expérience beauté premium et spirituelle",
];

// Positionnement : 70 % / 30 % de la hauteur d'écran sur ordinateur, hauteur libre sur mobile
export const Positioning = () => (
  <section className="flex w-full flex-col lg:h-svh lg:min-h-[640px]">
    <div className="flex items-center justify-center bg-blush px-6 py-20 md:px-16 md:py-24 lg:h-[70%] lg:py-0">
      <div className="w-full max-w-3xl">
        <h2 className="font-serif text-[clamp(1.5rem,2.6vw,2.5rem)] leading-snug font-normal text-balance text-cocoa">
          RODIQ se positionne comme une onglerie haut de gamme spécialisée dans&nbsp;:
        </h2>
        <ul className="mt-8 flex flex-col gap-4 md:mt-10 md:gap-5">
          {specialties.map((item) => (
            <li key={item} className="flex items-start gap-3 md:gap-4">
              <Minus
                className="mt-[0.2em] size-5 shrink-0 text-cocoa"
                strokeWidth={2}
                aria-hidden
              />
              <span className="text-[clamp(0.95rem,1.2vw,1.15rem)] leading-snug text-cocoa">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="flex items-center justify-center bg-taupe px-6 py-14 text-center md:px-16 lg:h-[30%] lg:py-0">
      <div className="max-w-3xl">
        <h3 className="font-serif text-[clamp(1.1rem,1.5vw,1.5rem)] font-semibold text-pearl">
          Notre différence ?
        </h3>
        <p className="mt-2 text-[clamp(0.95rem,1.2vw,1.15rem)] leading-relaxed text-balance text-pearl">
          Nous ne posons pas pour poser.
          <br />
          Nous réparons, renforçons et sublimons prioritairement l&apos;ongle naturel.
        </p>
      </div>
    </div>
  </section>
);

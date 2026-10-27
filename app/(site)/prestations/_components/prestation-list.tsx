"use client";

import { formatPrice } from "@/lib/prestations";
import { usePrestationCategories } from "@/lib/stores/prestations-store";
import { CarteGuard } from "./carte-guard";
import { ReserveButton } from "./reserve-button";

// Grille tarifaire (modifiable depuis l'admin) avec accès rapide aux catégories
export const PrestationList = () => {
  // Catégories vides masquées
  const prestationCategories = usePrestationCategories().filter((category) => category.prestations.length > 0);

  return (
    <CarteGuard>
      <nav aria-label="Catégories de prestations" className="mt-10 flex flex-wrap justify-center gap-3">
        {prestationCategories.map((category) => (
          <a
            key={category.id}
            href={`#${category.id}`}
            className="rounded-full border border-sand px-5 py-2 font-sans text-sm text-cocoa transition-colors hover:bg-sand"
          >
            {category.name}
          </a>
        ))}
      </nav>

      <div className="mt-16 flex flex-col gap-20 md:mt-20 md:gap-24">
        {prestationCategories.map((category) => (
            <section key={category.id} id={category.id} className="scroll-mt-32" aria-labelledby={`${category.id}-title`}>
              <header className="border-b border-sand pb-6">
                <h2
                  id={`${category.id}-title`}
                  className="font-serif text-[clamp(1.75rem,2.8vw,2.75rem)] leading-tight font-normal text-cocoa"
                >
                  {category.name}
                </h2>
                <p className="mt-2 font-serif text-[clamp(1.05rem,1.4vw,1.3rem)] text-taupe italic">
                  {category.tagline}
                </p>
              </header>

              <ul className="divide-y divide-sand">
                {category.prestations.map((prestation) => (
                  <li
                    key={prestation.id}
                    className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
                  >
                    <div className="min-w-0">
                      <h3 className="font-serif text-[clamp(1.1rem,1.5vw,1.35rem)] text-cocoa">
                        {prestation.name}
                      </h3>
                      {prestation.note && (
                        <p className="mt-1 font-sans text-sm text-taupe">{prestation.note}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:justify-end">
                      <p className="font-sans text-base whitespace-nowrap text-cocoa">
                        {formatPrice(prestation.price, prestation.fromPrice)}
                      </p>
                      <ReserveButton id={prestation.id} name={prestation.name} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </CarteGuard>
  );
};

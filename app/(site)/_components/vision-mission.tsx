const pillars = [
  {
    title: "Notre vision",
    text: "Devenir la référence en matière de soin et de mise en beauté des mains et des pieds, en alliant excellence, qualité, respect de l'ongle naturel et valeurs chrétiennes.",
  },
  {
    title: "Notre mission",
    text: "Offrir une expérience haut de gamme, où chaque cliente reçoit des soins de qualité, des conseils personnalisés, et un accompagnement pour des ongles sains, forts, beaux et durables.",
  },
];

// Vision & mission : bandeau centré, même disposition que « Notre différence ? »
export const VisionMission = () => (
  <section className="flex w-full items-center justify-center bg-cocoa px-4 py-16 text-center md:px-8 md:py-20">
    <div className="max-w-5xl">
      <h2 className="font-serif text-[clamp(2rem,3.6vw,3.5rem)] leading-tight font-normal text-pearl">
        Notre vision &amp; mission
      </h2>
      <div className="mt-10 flex flex-col gap-10">
        {pillars.map(({ title, text }, i) => (
          <div key={title}>
            {i > 0 && (
              <hr className="mx-auto mb-10 hidden h-px w-24 border-0 bg-pearl md:block" />
            )}
            {/* <h3 className="font-serif text-[clamp(1.1rem,1.5vw,1.5rem)] font-semibold text-pearl">
              {title}
            </h3> */}
            <p className="mt-2 text-[clamp(0.95rem,1.2vw,1.15rem)] leading-relaxed md:text-[24px] text-balance text-pearl">
              {text}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

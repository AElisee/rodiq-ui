import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { mainNav } from "@/lib/navigation";

// TODO : remplacer par les vraies coordonnées et horaires du salon
const contact = {
  address: "Adresse du salon",
  phone: "+225 00 00 00 00 44",
  email: "contact@rodiq.com",
};

const hours = [
  { days: "Lundi – Vendredi", time: "9h – 19h" },
  { days: "Samedi", time: "9h – 17h" },
  { days: "Dimanche", time: "Fermé" },
];

const socials = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "TikTok", href: "https://tiktok.com" },
];

const linkClass =
  "relative after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100";

// Pied de page : marque, navigation, contact et horaires sur fond chocolat
export const Footer = () => (
  <footer className="w-full bg-cocoa px-4 pt-20 pb-10 font-serif text-pearl md:px-8 md:pt-24">
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid gap-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-6 text-[clamp(1.05rem,1.4vw,1.25rem)] leading-snug italic">
            « Ne pas cacher. Prendre soin. »
          </p>
          <Link
            href="/reserver"
            className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-blush px-8 font-sans text-base text-cocoa transition-colors hover:bg-sand"
          >
            prendre rendez-vous
          </Link>
        </div>

        <nav aria-label="Pied de page">
          <h2 className="text-sm font-semibold tracking-[0.2em] text-blush uppercase">Menu</h2>
          <ul className="mt-6 flex flex-col gap-3">
            {mainNav.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold tracking-[0.2em] text-blush uppercase">Contact</h2>
          <address className="mt-6 flex flex-col gap-3 not-italic">
            <span>{contact.address}</span>
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className={linkClass + " self-start"}>
              {contact.phone}
            </a>
            <a href={`mailto:${contact.email}`} className={linkClass + " self-start"}>
              {contact.email}
            </a>
          </address>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-[0.2em] text-blush uppercase">Horaires</h2>
          <dl className="mt-6 flex flex-col gap-3">
            {hours.map(({ days, time }) => (
              <div key={days}>
                <dt>{days}</dt>
                <dd className="text-sand">{time}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <hr className="mt-16 h-px border-0 bg-taupe" />

      <div className="mt-8 flex flex-col items-center gap-6 text-sm md:flex-row md:justify-between">
        <ul className="flex gap-8">
          {socials.map(({ label, href }) => (
            <li key={label}>
              <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-center gap-2 text-sand md:flex-row md:gap-6">
          <Link href="/mentions-legales" className={linkClass}>
            Mentions légales
          </Link>
          <span>© RODIQ. Tous droits réservés.</span>
        </div>
      </div>
    </div>
  </footer>
);

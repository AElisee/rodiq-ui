"use client";

import { groupOpeningHours } from "@/lib/reservations";
import { useSettingsHydrated, useSettingsStore } from "@/lib/stores/settings-store";
import { formatPhone, withDialCode } from "@/lib/validation";

// Coordonnées, itinéraire, horaires et réseaux du salon, modifiables depuis l'admin (pied de page)

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export const SalonContact = ({ linkClassName }: { linkClassName: string }) => {
  useSettingsHydrated();
  const address = useSettingsStore((s) => s.salon.address);
  const { phone, phoneSecondary, whatsapp, email } = useSettingsStore((s) => s.platform);
  const { lat, lng } = useSettingsStore((s) => s.location);

  return (
    <address className="mt-6 flex flex-col gap-3 not-italic">
      <span>{address}</span>
      {[phone, phoneSecondary].filter(Boolean).map((number) => (
        <a key={number} href={telHref(number)} className={`${linkClassName} self-start`}>
          {withDialCode(formatPhone(number))}
        </a>
      ))}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkClassName} self-start`}
        >
          WhatsApp
        </a>
      )}
      <a href={`mailto:${email}`} className={`${linkClassName} self-start`}>
        {email}
      </a>
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkClassName} self-start`}
      >
        Itinéraire
      </a>
    </address>
  );
};

export const SalonHours = () => {
  useSettingsHydrated();
  const week = useSettingsStore((s) => s.week);

  return (
    <dl className="mt-6 flex flex-col gap-3">
      {groupOpeningHours(week).map(({ days, time }) => (
        <div key={days}>
          <dt>{days}</dt>
          <dd className="text-sand">{time}</dd>
        </div>
      ))}
    </dl>
  );
};

export const PlatformTagline = ({ className }: { className?: string }) => {
  useSettingsHydrated();
  const tagline = useSettingsStore((s) => s.platform.tagline);
  return tagline ? <p className={className}>{tagline}</p> : null;
};

const socialLabels = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" } as const;

// Réseaux renseignés dans l'admin (les champs vides sont masqués)
export const SocialLinks = ({ linkClassName }: { linkClassName: string }) => {
  useSettingsHydrated();
  const socials = useSettingsStore((s) => s.platform.socials);

  return (
    <ul className="flex gap-8">
      {(Object.keys(socialLabels) as (keyof typeof socialLabels)[])
        .filter((key) => socials[key])
        .map((key) => (
          <li key={key}>
            <a href={socials[key]} target="_blank" rel="noopener noreferrer" className={linkClassName}>
              {socialLabels[key]}
            </a>
          </li>
        ))}
    </ul>
  );
};

export const Copyright = () => {
  useSettingsHydrated();
  const name = useSettingsStore((s) => s.platform.name);
  return <span>© {name.toUpperCase()}. Tous droits réservés.</span>;
};

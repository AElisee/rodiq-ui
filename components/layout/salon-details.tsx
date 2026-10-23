"use client";

import { groupOpeningHours } from "@/lib/reservations";
import { useSettingsHydrated, useSettingsStore } from "@/lib/stores/settings-store";

// Coordonnées et horaires du salon, modifiables depuis l'admin (pied de page)

export const SalonContact = ({ linkClassName }: { linkClassName: string }) => {
  useSettingsHydrated();
  const { address, phone, email } = useSettingsStore((s) => s.salon);

  return (
    <address className="mt-6 flex flex-col gap-3 not-italic">
      <span>{address}</span>
      <a href={`tel:${phone.replace(/\s/g, "")}`} className={`${linkClassName} self-start`}>
        {phone}
      </a>
      <a href={`mailto:${email}`} className={`${linkClassName} self-start`}>
        {email}
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

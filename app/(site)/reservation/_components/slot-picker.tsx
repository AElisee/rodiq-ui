"use client";

import { fr } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { formatDay, formatSlotTime, toDateKey, type Slot } from "@/lib/reservations";
import { cn } from "@/lib/utils";

type SlotPickerProps = {
  slots: Slot[];
  day: string | undefined;
  onDayChange: (day: string) => void;
  slotId: string | undefined;
  onSlotChange: (slotId: string) => void;
};

// Étape 2 : choix du jour puis du créneau ; seuls les créneaux avec une place libre sont réservables
export const SlotPicker = ({ slots, day, onDayChange, slotId, onSlotChange }: SlotPickerProps) => {
  const availableDays = new Set(slots.filter((s) => s.remaining !== 0).map((s) => s.date));
  const daySlots = slots.filter((s) => s.date === day);

  if (availableDays.size === 0) {
    return (
      <p className="font-serif text-lg text-taupe italic">
        Aucun créneau n&apos;est disponible pour le moment. Revenez bientôt ou contactez-nous.
      </p>
    );
  }

  const firstDay = new Date(`${slots[0].date}T00:00`);
  const lastDay = new Date(`${slots[slots.length - 1].date}T00:00`);

  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr] md:gap-10">
      <Calendar
        mode="single"
        locale={fr}
        selected={day ? new Date(`${day}T00:00`) : undefined}
        onSelect={(date) => date && onDayChange(toDateKey(date))}
        disabled={(date) => !availableDays.has(toDateKey(date))}
        defaultMonth={day ? new Date(`${day}T00:00`) : firstDay}
        startMonth={firstDay}
        endMonth={lastDay}
        showOutsideDays={false}
        className="mx-auto rounded-[var(--radius)] border border-sand bg-pearl p-4 font-sans text-cocoa [--cell-size:--spacing(10)] md:mx-0"
      />

      <div>
        {day ? (
          <>
            <p className="font-serif text-lg text-cocoa first-letter:uppercase">{formatDay(day)}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {daySlots.map((slot) => {
                const full = slot.remaining === 0;
                const selected = slot.id === slotId;
                return (
                  <li key={slot.id}>
                    <button
                      type="button"
                      onClick={() => onSlotChange(slot.id)}
                      disabled={full}
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full flex-col items-start rounded-[var(--radius)] border border-sand px-5 py-3 text-left font-sans text-cocoa transition-colors hover:bg-sand disabled:pointer-events-none disabled:text-taupe",
                        selected && "border-cocoa bg-sand",
                      )}
                    >
                      <span className="text-base">{formatSlotTime(slot.start, slot.end)}</span>
                      <span className="text-sm text-taupe">
                        {full
                          ? "Complet"
                          : slot.remaining === null
                            ? "Places disponibles"
                            : `${slot.remaining} place${slot.remaining > 1 ? "s" : ""} disponible${slot.remaining > 1 ? "s" : ""}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="font-serif text-lg text-taupe italic">
            Choisissez une date pour voir les créneaux disponibles.
          </p>
        )}
      </div>
    </div>
  );
};

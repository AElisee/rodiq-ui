"use client";

import { format } from "date-fns";
import { fr as dateFnsFr } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { fr } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toDateKey } from "@/lib/reservations";
import { cn } from "@/lib/utils";
import { adminInputClassName } from "./admin-ui";

const fromKey = (key: string) => new Date(`${key}T00:00`);

// Champ date de l'admin : calendrier shadcn dans un popover, valeur au format yyyy-MM-dd
export const AdminDatePicker = ({
  id,
  value,
  onChange,
  min,
  placeholder = "Choisir une date",
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const selected = value ? fromKey(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(adminInputClassName, "flex items-center justify-between gap-3 text-left", className)}
        >
          <span className={cn(!selected && "text-taupe")}>
            {selected ? format(selected, "d MMMM yyyy", { locale: dateFnsFr }) : placeholder}
          </span>
          <CalendarDays className="size-4 shrink-0 text-taupe" strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto bg-pearl p-0 ring-sand">
        <Calendar
          mode="single"
          locale={fr}
          selected={selected}
          defaultMonth={selected ?? (min ? fromKey(min) : undefined)}
          onSelect={(date) => {
            if (!date) return;
            onChange(toDateKey(date));
            setOpen(false);
          }}
          disabled={min ? { before: fromKey(min) } : undefined}
          startMonth={min ? fromKey(min) : undefined}
          className="rounded-[var(--radius)] p-3 font-sans text-cocoa [--cell-size:--spacing(9)]"
        />
      </PopoverContent>
    </Popover>
  );
};

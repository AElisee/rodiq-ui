"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { mainNav } from "@/lib/navigation";

export const MobileNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Ouvrir le menu"
        className="flex h-10 w-12 flex-col items-center justify-center gap-2.5"
      >
        <span className="h-px w-11 bg-current" />
        <span className="h-px w-11 bg-current" />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full bg-pearl px-8 pt-24 font-serif data-[side=right]:sm:max-w-sm"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Navigation principale du site Rodiq
        </SheetDescription>
        <nav className="flex flex-col gap-6">
          {mainNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-3xl text-cocoa"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/reserver"
          onClick={() => setOpen(false)}
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-blush px-8 font-sans text-base text-cocoa"
        >
          Prendre rendez-vous
        </Link>
      </SheetContent>
    </Sheet>
  );
};

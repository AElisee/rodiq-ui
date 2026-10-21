"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { CartLink } from "@/components/layout/cart-link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { mainNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// Header fixe : transparent sur le hero, fond perlé dès qu'on scrolle
export const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className={cn(
        "fixed inset-x-0 top-0 z-20 font-serif transition-[background-color,color,box-shadow] duration-300",
        scrolled ? "bg-pearl text-cocoa shadow-sm" : "bg-transparent text-pearl"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1680px] items-center justify-between px-5 transition-[padding] duration-300 md:px-28",
          scrolled ? "py-5 md:py-5" : "py-10 md:py-9"
        )}
      >
        <Logo />

        <nav className="hidden items-center gap-10 lg:flex">
          {mainNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-base font-semibold after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100"
            >
              {link.label}
            </Link>
          ))}
          <CartLink />
        </nav>

        <div className="flex items-center gap-8 lg:hidden">
          <CartLink />
          <MobileNav />
        </div>
      </div>
    </header>
  );
};

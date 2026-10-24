"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { AccountLink } from "@/components/layout/account-link";
import { CartLink } from "@/components/layout/cart-link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { isNavActive, mainNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// Header fixe : transparent sur le hero, fond perlé dès qu'on scrolle
export const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

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
        <Logo tone={scrolled ? "dark" : "light"} />

        <nav className="hidden items-center gap-2 lg:flex">
          {mainNav.map((link) => {
            const active = isNavActive(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-4 py-1.5 text-base font-semibold transition-colors after:absolute after:inset-x-4 after:bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out",
                  active ? "bg-sand text-cocoa" : "hover:after:scale-x-100"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="ml-4">
            <CartLink />
          </div>
          <div className="ml-8">
            <AccountLink />
          </div>
        </nav>

        <div className="flex items-center gap-8 lg:hidden">
          <CartLink />
          <AccountLink />
          <MobileNav />
        </div>
      </div>
    </header>
  );
};

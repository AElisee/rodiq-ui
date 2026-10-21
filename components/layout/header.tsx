import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CartLink } from "@/components/layout/cart-link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { mainNav } from "@/lib/navigation";

// Header transparent posé sur le hero
export const Header = () => (
  <header className="absolute inset-x-0 top-0 z-20 font-serif text-pearl">
    <div className="mx-auto flex max-w-[1680px] items-center justify-between px-10 py-10 md:px-28 md:py-9">
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

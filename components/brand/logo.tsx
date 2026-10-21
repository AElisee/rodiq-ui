import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

// Logo texte provisoire, en attendant le SVG fourni par la cliente
export const Logo = ({ className }: LogoProps) => (
  <Link
    href="/"
    aria-label="Rodiq, accueil"
    className={cn(
      "font-serif text-4xl font-normal leading-none tracking-tight md:text-6xl",
      className
    )}
  >
    Rodiq
  </Link>
);

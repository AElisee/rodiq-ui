import { type CSSProperties, type ElementType } from "react";
import { cn } from "@/lib/utils";

// Shimmer de shadcn (AI Elements) : un reflet traverse le texte pendant une action en cours.
// Animé en CSS (`animate-shimmer` de globals.css) plutôt qu'avec motion.
export type ShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

export const Shimmer = ({ children, as: Component = "span", className, duration = 2, spread = 2 }: ShimmerProps) => (
  <Component
    className={cn(
      "relative inline-block animate-shimmer bg-[length:250%_100%,auto] bg-clip-text text-transparent",
      "[--bg:linear-gradient(90deg,transparent_calc(50%-var(--spread)),var(--color-background),transparent_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
      className,
    )}
    style={
      {
        "--spread": `${children.length * spread}px`,
        "--shimmer-duration": `${duration}s`,
        backgroundImage: "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
      } as CSSProperties
    }
  >
    {children}
  </Component>
);

// Libellé d'un bouton d'action : reflet Shimmer tant que l'API n'a pas répondu
export const PendingLabel = ({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel?: string;
  children: string;
}) => (pending ? <Shimmer>{pendingLabel ?? children}</Shimmer> : children);

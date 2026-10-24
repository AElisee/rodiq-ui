import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { AdminPanel, AdminPanelTitle, adminSmallOutlineButtonClassName } from "@/components/admin/admin-ui";

// Briques des pages de détail (réservation, commande)

export const AdminBackLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link
    href={href}
    className="inline-flex w-fit items-center gap-1.5 font-sans text-sm text-taupe transition-colors hover:text-cocoa"
  >
    <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
    {children}
  </Link>
);

export const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-6">
    <dt className="shrink-0 text-taupe">{label}</dt>
    <dd className="min-w-0 break-words sm:text-right">{children}</dd>
  </div>
);

export const DetailPanel = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <AdminPanel className="font-sans text-cocoa">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <AdminPanelTitle>{title}</AdminPanelTitle>
      {action}
    </div>
    {children}
  </AdminPanel>
);

// Identifiant inconnu (supprimé, ou lien venant d'un autre navigateur en maquette)
export const DetailNotFound = ({ title, href, label }: { title: string; href: string; label: string }) => (
  <div className="flex flex-col items-center rounded-[var(--radius)] border border-sand py-16 text-center">
    <p className="font-serif text-lg text-cocoa">{title}</p>
    <Link href={href} className={`mt-6 ${adminSmallOutlineButtonClassName}`}>
      {label}
    </Link>
  </div>
);

export const detailLinkClassName = "font-sans text-xs text-cocoa underline underline-offset-4 hover:text-taupe";

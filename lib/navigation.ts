export type NavLink = {
  label: string;
  href: string;
};

// Menu principal du site public (les pages seront créées plus tard)
export const mainNav: NavLink[] = [
  { label: "Accueil", href: "/" },
  { label: "Prestations", href: "/prestations" },
  { label: "Histoire", href: "/histoire" },
  { label: "Réservation", href: "/reservation" },
  // { label: "Contact", href: "/contact" },
  { label: "Boutique", href: "/boutique" },
];

// Lien actif : correspondance exacte pour l'accueil, par préfixe pour les sections
export const isNavActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export type NavLink = {
  label: string;
  href: string;
};

// Menu principal du site public (les pages seront créées plus tard)
export const mainNav: NavLink[] = [
  { label: "Prestations", href: "/prestations" },
  { label: "Notre histoire", href: "/histoire" },
  { label: "Boutique", href: "/boutique" },
  { label: "Contact", href: "/contact" },
];

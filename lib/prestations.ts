export type Prestation = {
  id: string;
  name: string;
  price: number;
  // Prix d'appel : le tarif final dépend de la prestation réalisée
  fromPrice?: boolean;
  note?: string;
};

export type PrestationCategory = {
  id: string;
  name: string;
  tagline: string;
  prestations: Prestation[];
};

// Grille tarifaire transmise par la cliente (prix en FCFA)
export const prestationCategories: PrestationCategory[] = [
  {
    id: "mains",
    name: "Mains",
    tagline: "Manucure & beauté des ongles",
    prestations: [
      { id: "manucure-simple", name: "Manucure simple", price: 3000 },
      { id: "pose-mains", name: "Pose mains", price: 3000 },
      { id: "vernis-permanent-mains", name: "Vernis permanent mains", price: 5000 },
    ],
  },
  {
    id: "pieds",
    name: "Pieds",
    tagline: "Pédicure & soin des pieds",
    prestations: [
      { id: "pedicure-simple", name: "Pédicure simple", price: 5000 },
      { id: "pose-pieds", name: "Pose pieds", price: 4000 },
      { id: "vernis-permanent-pieds", name: "Vernis permanent pieds", price: 5000 },
      { id: "soin-des-pieds", name: "Soin des pieds", price: 10000, fromPrice: true },
    ],
  },
  {
    id: "mains-et-pieds",
    name: "Mains & pieds",
    tagline: "Nos formules complètes",
    prestations: [
      { id: "pedicure-manucure", name: "Pédicure + manucure", price: 8000 },
      { id: "pose-mains-pieds", name: "Pose mains et pieds", price: 6000 },
      {
        id: "vernis-permanent-mains-pieds",
        name: "Vernis permanent mains et pieds",
        price: 8000,
      },
      {
        id: "pedicure-manucure-pose",
        name: "Pédicure + manucure + pose",
        price: 12000,
        note: "Mains et pieds",
      },
      {
        id: "pedicure-manucure-vernis-permanent",
        name: "Pédicure + manucure + vernis permanent",
        price: 15000,
        note: "Mains et pieds",
      },
    ],
  },
  {
    id: "beaute",
    name: "Coiffure & maquillage",
    tagline: "Pour sublimer votre allure",
    prestations: [
      {
        id: "tresses",
        name: "Tresses",
        price: 15000,
        fromPrice: true,
        note: "Mèches incluses",
      },
      { id: "maquillage", name: "Maquillage", price: 10000, fromPrice: true },
    ],
  },
];

export const allPrestations = prestationCategories.flatMap((c) => c.prestations);

const priceFormatter = new Intl.NumberFormat("fr-FR");

export const formatPrice = (price: number, fromPrice = false) =>
  `${fromPrice ? "dès " : ""}${priceFormatter.format(price)} FCFA`;

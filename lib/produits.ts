import type { StaticImageData } from "next/image";

export type ProductCategory = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  // Prix en FCFA
  price: number;
  // Prix d'origine (FCFA) affiché barré quand le produit est en promotion
  compareAtPrice?: number;
  description?: string;
  image?: StaticImageData;
  soldOut?: boolean;
};

export const productCategories: ProductCategory[] = [
  { id: "vernis", name: "Vernis" },
  { id: "soins-ongles", name: "Soins des ongles" },
  { id: "mains-pieds", name: "Mains & pieds" },
  { id: "accessoires", name: "Accessoires" },
];

// Catalogue provisoire : à remplacer par les produits (noms, prix, photos) transmis par la cliente
export const products: Product[] = [
  { id: "vernis-nude-rose", name: "Vernis nude rosé", categoryId: "vernis", price: 6000 },
  { id: "vernis-rouge-cerise", name: "Vernis rouge cerise", categoryId: "vernis", price: 6000 },
  { id: "vernis-beige-sable", name: "Vernis beige sable", categoryId: "vernis", price: 6000 },
  {
    id: "vernis-chocolat",
    name: "Vernis chocolat",
    categoryId: "vernis",
    price: 6000,
    soldOut: true,
  },
  {
    id: "base-top-coat",
    name: "Base & top coat 2-en-1",
    categoryId: "vernis",
    price: 8000,
  },
  {
    id: "top-coat-sechage-rapide",
    name: "Top coat séchage rapide",
    categoryId: "vernis",
    price: 7500,
  },
  {
    id: "huile-cuticules",
    name: "Huile pour cuticules",
    categoryId: "soins-ongles",
    price: 9000,
    compareAtPrice: 12000,
  },
  {
    id: "elixir-fortifiant",
    name: "Élixir fortifiant",
    categoryId: "soins-ongles",
    price: 10000,
  },
  { id: "durcisseur", name: "Durcisseur d'ongles", categoryId: "soins-ongles", price: 10000 },
  {
    id: "stylo-correcteur",
    name: "Stylo correcteur",
    categoryId: "soins-ongles",
    price: 4000,
  },
  {
    id: "creme-mains-karite",
    name: "Crème mains au karité",
    categoryId: "mains-pieds",
    price: 7000,
    compareAtPrice: 9000,
  },
  {
    id: "baume-pieds",
    name: "Baume pieds réparateur",
    categoryId: "mains-pieds",
    price: 9000,
    soldOut: true,
  },
  { id: "gommage-pieds", name: "Gommage pieds", categoryId: "mains-pieds", price: 8500 },
  { id: "vernis-rose-poudre", name: "Vernis rose poudré", categoryId: "vernis", price: 6000 },
  { id: "vernis-blanc-perle", name: "Vernis blanc perlé", categoryId: "vernis", price: 6000 },
  { id: "vernis-terracotta", name: "Vernis terracotta", categoryId: "vernis", price: 6000 },
  { id: "vernis-bordeaux", name: "Vernis bordeaux", categoryId: "vernis", price: 6000 },
  {
    id: "vernis-or-scintillant",
    name: "Vernis or scintillant",
    categoryId: "vernis",
    price: 6500,
    compareAtPrice: 8000,
  },
  {
    id: "vernis-caramel",
    name: "Vernis caramel",
    categoryId: "vernis",
    price: 6000,
    soldOut: true,
  },
  { id: "vernis-taupe", name: "Vernis taupe", categoryId: "vernis", price: 6000 },
  { id: "vernis-mauve", name: "Vernis mauve", categoryId: "vernis", price: 6000 },
  { id: "base-lissante", name: "Base lissante", categoryId: "vernis", price: 7500 },
  { id: "top-coat-mat", name: "Top coat effet mat", categoryId: "vernis", price: 7500 },
  {
    id: "dissolvant-doux",
    name: "Dissolvant doux sans acétone",
    categoryId: "soins-ongles",
    price: 5000,
  },
  {
    id: "serum-croissance",
    name: "Sérum croissance des ongles",
    categoryId: "soins-ongles",
    price: 12000,
    compareAtPrice: 15000,
  },
  {
    id: "huile-cuticules-roll-on",
    name: "Huile cuticules roll-on",
    categoryId: "soins-ongles",
    price: 6000,
  },
  {
    id: "creme-cuticules",
    name: "Crème pour cuticules",
    categoryId: "soins-ongles",
    price: 7000,
    soldOut: true,
  },
  { id: "masque-mains", name: "Masque mains nourrissant", categoryId: "mains-pieds", price: 8000 },
  {
    id: "gommage-mains",
    name: "Gommage mains au sucre",
    categoryId: "mains-pieds",
    price: 7500,
  },
  {
    id: "chaussettes-hydratantes",
    name: "Chaussettes hydratantes",
    categoryId: "mains-pieds",
    price: 6500,
  },
  { id: "sels-bain-pieds", name: "Sels de bain pour pieds", categoryId: "mains-pieds", price: 5500 },
  { id: "creme-pieds-karite", name: "Crème pieds au karité", categoryId: "mains-pieds", price: 7000 },
  { id: "lime-verre", name: "Lime en verre", categoryId: "accessoires", price: 4500 },
  { id: "polissoir", name: "Polissoir 4 faces", categoryId: "accessoires", price: 2500 },
  {
    id: "repousse-cuticules",
    name: "Repousse-cuticules inox",
    categoryId: "accessoires",
    price: 3500,
  },
  { id: "pince-cuticules", name: "Pince à cuticules", categoryId: "accessoires", price: 5000 },
  { id: "rape-pieds", name: "Râpe pieds", categoryId: "accessoires", price: 4000 },
  {
    id: "separateurs-orteils",
    name: "Séparateurs d'orteils",
    categoryId: "accessoires",
    price: 1500,
  },
  {
    id: "trousse-manucure",
    name: "Trousse manucure complète",
    categoryId: "accessoires",
    price: 15000,
    compareAtPrice: 20000,
  },
];

// Pourcentage de réduction arrondi, ou null si le produit n'est pas en promotion
export const getDiscountPercent = (product: Product) =>
  product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : null;

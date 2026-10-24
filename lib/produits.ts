import type { StaticImageData } from "next/image";

export type ProductCategory = {
  id: string;
  name: string;
  // Texte affiché sur la fiche des produits qui n'ont pas encore leur propre description
  description: string;
};

// Photo importée dans le code, ou ajoutée depuis l'admin (data URL en attendant le stockage de fichiers)
export type ProductImage = StaticImageData | string;

// Déclinaison d'un produit (teinte, contenance…) avec son propre stock, au prix du produit
export type ProductVariant = {
  id: string;
  name: string;
  stock: number;
};

// Quantité mesurée d'un produit (contenance ou poids), ex. 300 ml, 1 kg
export const CAPACITY_UNITS = ["ml", "cl", "L"] as const;
export const WEIGHT_UNITS = ["g", "kg"] as const;
export type CapacityUnit = (typeof CAPACITY_UNITS)[number];
export type WeightUnit = (typeof WEIGHT_UNITS)[number];
export type Measure<Unit extends string = string> = { value: number; unit: Unit };

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  // Prix en FCFA
  price: number;
  // Prix d'origine (FCFA) affiché barré quand le produit est en promotion
  compareAtPrice?: number;
  description?: string;
  // Contenance (300 ml) et poids (1 kg) affichés sur la fiche
  capacity?: Measure<CapacityUnit>;
  weight?: Measure<WeightUnit>;
  // Photos du produit : la première sert de visuel principal (boutique, panier)
  images?: ProductImage[];
  // Déclinaisons : le stock est alors suivi par déclinaison
  variants?: ProductVariant[];
  // Nom du choix proposé (« Teinte », « Contenance »…)
  variantLabel?: string;
  // Quantité restante d'un produit sans déclinaison
  stock?: number;
  // Alerte « stock faible » dans l'admin à partir de cette quantité restante
  lowStockThreshold?: number;
  // Calculé depuis le stock (voir lib/stores/catalog-store.ts)
  soldOut?: boolean;
};

// Stock de départ des produits du catalogue qui n'en précisent pas
export const DEFAULT_STOCK = 10;
export const DEFAULT_LOW_STOCK_THRESHOLD = 3;
export const DEFAULT_VARIANT_LABEL = "Déclinaison";

export const formatMeasure = ({ value, unit }: Measure) => `${value.toLocaleString("fr-FR")} ${unit}`;

// Contenance puis poids, mis en forme (« 300 ml », « 1 kg »)
export const productMeasures = (product: Product) =>
  [product.capacity, product.weight].flatMap((m) => (m ? [formatMeasure(m)] : []));

export const imageSrc = (image: ProductImage) => (typeof image === "string" ? image : image.src);

// Quantité restante : celle de la déclinaison, sinon le total des déclinaisons, sinon celle du produit
export const productStock = (product: Product, variantId?: string) => {
  if (product.variants?.length) {
    if (variantId) return product.variants.find((v) => v.id === variantId)?.stock ?? 0;
    return product.variants.reduce((sum, v) => sum + v.stock, 0);
  }
  return product.stock ?? 0;
};

export type StockLevel = "ok" | "faible" | "epuise";

export const stockLevel = (stock: number, threshold = DEFAULT_LOW_STOCK_THRESHOLD): StockLevel =>
  stock <= 0 ? "epuise" : stock <= threshold ? "faible" : "ok";

// Niveau le plus critique du produit (une seule déclinaison épuisée suffit à alerter)
export const productLevel = (product: Product): StockLevel => {
  const levels = product.variants?.length
    ? product.variants.map((v) => stockLevel(v.stock, product.lowStockThreshold))
    : [stockLevel(productStock(product), product.lowStockThreshold)];
  return levels.includes("epuise") ? "epuise" : levels.includes("faible") ? "faible" : "ok";
};

// Produit ou déclinaison à réapprovisionner (épuisé ou sous le seuil d'alerte)
export type StockAlert = { product: Product; variant?: ProductVariant; stock: number; level: Exclude<StockLevel, "ok"> };

export const stockAlerts = (products: Product[]): StockAlert[] =>
  products.flatMap((product) => {
    const entries = product.variants?.length
      ? product.variants.map((variant) => ({ variant, stock: variant.stock }))
      : [{ variant: undefined, stock: productStock(product) }];
    return entries.flatMap(({ variant, stock }) => {
      const level = stockLevel(stock, product.lowStockThreshold);
      return level === "ok" ? [] : [{ product, variant, stock, level }];
    });
  });

// Catégories de départ : ajoutées, modifiées, réordonnées et supprimées ensuite depuis l'admin (catalog-store)
export const productCategories: ProductCategory[] = [
  {
    id: "vernis",
    name: "Vernis",
    description:
      "Une couleur soigneusement choisie pour sublimer vos ongles, avec une tenue et une brillance pensées pour durer entre deux rendez-vous.",
  },
  {
    id: "soins-ongles",
    name: "Soins des ongles",
    description:
      "Un soin ciblé pour nourrir, renforcer et protéger l'ongle naturel au quotidien, dans le prolongement de nos prestations.",
  },
  {
    id: "mains-pieds",
    name: "Mains & pieds",
    description:
      "Une formule douce et nourrissante pour garder des mains et des pieds souples et réconfortés, jour après jour.",
  },
  {
    id: "accessoires",
    name: "Accessoires",
    description:
      "Un accessoire de qualité professionnelle pour entretenir vos ongles chez vous avec précision et en douceur.",
  },
];

// Catalogue provisoire : à remplacer par les produits (noms, prix, photos) transmis par la cliente.
// Photos : importer les fichiers de public/images/produits puis les lister dans `images`, ex.
//   import vernisNude1 from "@/public/images/produits/vernis-nude-rose-1.jpg";
//   { id: "vernis-nude-rose", …, images: [vernisNude1, vernisNude2] }
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

export const getProduct = (id: string) => products.find((p) => p.id === id);

// Catégories de départ seulement : côté navigateur, lire useProductCategories (catalog-store)
export const getCategory = (id: string) => productCategories.find((c) => c.id === id);

// Autres produits de la même catégorie, disponibles en premier
export const getRelatedProducts = (product: Product, catalog: Product[], limit = 4) =>
  catalog
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .toSorted((a, b) => Number(a.soldOut ?? false) - Number(b.soldOut ?? false))
    .slice(0, limit);

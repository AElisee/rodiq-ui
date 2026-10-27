// Boutique : types de référence et règles d'affichage. Les catégories et les produits viennent de l'API
// (`lib/api/boutique.ts`), le stock est calculé et vérifié par le serveur.

export type ProductCategory = {
  id: string;
  name: string;
  // Texte affiché sur la fiche des produits qui n'ont pas encore leur propre description (peut être vide)
  description: string;
};

// Catégorie vue par l'admin
export type AdminProductCategory = ProductCategory & {
  // Produits de la catégorie, masqués compris (une catégorie non vide ne peut pas être supprimée)
  productCount: number;
};

export type StockLevel = "ok" | "faible" | "epuise";

// Déclinaison d'un produit (teinte, contenance…) avec son propre stock, au prix du produit
export type ProductVariant = {
  id: string;
  name: string;
  // Site : quantité qu'on peut mettre au panier (plafonnée par l'API) ; admin : stock exact
  stock: number;
};

// Quantité mesurée d'un produit (contenance ou poids), ex. 300 ml, 1 kg
export const CAPACITY_UNITS = ["ml", "cl", "L"] as const;
export const WEIGHT_UNITS = ["g", "kg"] as const;
export type CapacityUnit = (typeof CAPACITY_UNITS)[number];
export type WeightUnit = (typeof WEIGHT_UNITS)[number];
export type Measure<Unit extends string = string> = { value: number; unit: Unit };

// Produit vu par le site (jamais un produit masqué)
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
  // Adresses des photos : la première sert de visuel principal (boutique, panier)
  images?: string[];
  // Déclinaisons : le stock est alors suivi par déclinaison
  variants?: ProductVariant[];
  // Produit sans déclinaison : quantité qu'on peut mettre au panier (plafonnée à 10 par l'API, le stock
  // exact reste privé)
  stock?: number;
  // Plus rien à vendre (toutes les déclinaisons épuisées)
  soldOut?: boolean;
};

// Déclinaison vue par l'admin : stock exact et niveau calculé par le serveur
export type AdminProductVariant = ProductVariant & { level: StockLevel };

// Produit vu par l'admin (masqués compris)
export type AdminProduct = Omit<Product, "variants" | "stock"> & {
  variants: AdminProductVariant[];
  // Stock d'un produit sans déclinaison (0 s'il en a)
  stock: number;
  // Somme des déclinaisons, ou stock du produit
  totalStock: number;
  // Alerte « stock faible » à partir de cette quantité restante (par déclinaison s'il y en a)
  lowStockThreshold: number;
  // Niveau le plus critique : une seule déclinaison épuisée donne « epuise »
  level: StockLevel;
  hidden: boolean;
  // Identifiants des photos, dans l'ordre de `images` (pour les retirer ou les réordonner)
  photoIds: string[];
  // À renvoyer avec la modification : refus (409) si le produit a changé entre-temps
  version: number;
  createdAt: string;
  updatedAt: string;
};

// Produit ou déclinaison à réapprovisionner (épuisé ou sous son seuil d'alerte), calculé par l'API
export type StockAlert = {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  stock: number;
  level: Exclude<StockLevel, "ok">;
};

export const MAX_PHOTOS = 4;
export const DEFAULT_LOW_STOCK_THRESHOLD = 3;
export const VARIANT_LABEL = "Variant";

export const formatMeasure = ({ value, unit }: Measure) => `${value.toLocaleString("fr-FR")} ${unit}`;

// Contenance puis poids, mis en forme (« 300 ml », « 1 kg »)
export const productMeasures = (product: Pick<Product, "capacity" | "weight">) =>
  [product.capacity, product.weight].flatMap((m) => (m ? [formatMeasure(m)] : []));

// Quantité restante : celle de la déclinaison, sinon le total des déclinaisons, sinon celle du produit
export const productStock = (product: Product, variantId?: string) => {
  if (product.variants?.length) {
    if (variantId) return product.variants.find((v) => v.id === variantId)?.stock ?? 0;
    return product.variants.reduce((sum, v) => sum + v.stock, 0);
  }
  return product.stock ?? 0;
};

export const stockLevel = (stock: number, threshold = DEFAULT_LOW_STOCK_THRESHOLD): StockLevel =>
  stock <= 0 ? "epuise" : stock <= threshold ? "faible" : "ok";

// Pourcentage de réduction arrondi, ou null si le produit n'est pas en promotion
export const getDiscountPercent = (product: Pick<Product, "price" | "compareAtPrice">) =>
  product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : null;

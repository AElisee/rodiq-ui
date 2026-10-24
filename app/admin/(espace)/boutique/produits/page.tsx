import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsEditor } from "../_components/products-editor";

export const metadata: Metadata = {
  title: "Produits",
};

// Suspense : les filtres se lisent dans l'URL (?stock=alerte depuis le tableau de bord, ?categorie=… depuis les catégories)
const AdminProductsPage = () => (
  <Suspense fallback={<div className="min-h-96" aria-hidden />}>
    <ProductsEditor />
  </Suspense>
);

export default AdminProductsPage;

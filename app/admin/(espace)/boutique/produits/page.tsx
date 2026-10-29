import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminListSkeleton } from "@/components/admin/admin-skeleton";
import { ProductsEditor } from "../_components/products-editor";

export const metadata: Metadata = {
  title: "Catalogue produits",
};

// Suspense : les filtres se lisent dans l'URL (?stock=alerte depuis le tableau de bord, ?categorie=… depuis les catégories)
const AdminProductsPage = () => (
  <Suspense fallback={<AdminListSkeleton filters={4} columns={6} />}>
    <ProductsEditor />
  </Suspense>
);

export default AdminProductsPage;

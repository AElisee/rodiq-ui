import type { Metadata } from "next";
import { ProductEdit } from "../../../_components/product-edit";

export const metadata: Metadata = {
  title: "Modifier le produit",
};

// Produits ajoutés depuis l'admin connus du navigateur seulement (localStorage) : rendu à la demande
export const instant = false;

const AdminProductEditPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <ProductEdit id={decodeURIComponent(id)} />;
};

export default AdminProductEditPage;

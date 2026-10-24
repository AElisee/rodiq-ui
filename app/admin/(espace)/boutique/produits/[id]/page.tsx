import type { Metadata } from "next";
import { ProductDetails } from "../../_components/product-details";

export const metadata: Metadata = {
  title: "Produit",
};

// Produits ajoutés depuis l'admin connus du navigateur seulement (localStorage) : rendu à la demande
export const instant = false;

const AdminProductPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <ProductDetails id={decodeURIComponent(id)} />;
};

export default AdminProductPage;

import type { Metadata } from "next";
import { ProductsEditor } from "./_components/products-editor";

export const metadata: Metadata = {
  title: "Boutique",
};

const AdminBoutiquePage = () => <ProductsEditor />;

export default AdminBoutiquePage;

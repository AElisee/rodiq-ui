import type { Metadata } from "next";
import { CategoriesEditor } from "../_components/categories-editor";

export const metadata: Metadata = {
  title: "Catégories de produits",
};

const AdminProductCategoriesPage = () => <CategoriesEditor />;

export default AdminProductCategoriesPage;

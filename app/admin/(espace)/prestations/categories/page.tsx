import type { Metadata } from "next";
import { PrestationCategoriesEditor } from "../_components/prestation-categories-editor";

export const metadata: Metadata = {
  title: "Catégories de prestations",
};

const AdminPrestationCategoriesPage = () => <PrestationCategoriesEditor />;

export default AdminPrestationCategoriesPage;

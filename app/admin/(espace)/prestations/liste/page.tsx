import type { Metadata } from "next";
import { PrestationsEditor } from "../_components/prestations-editor";

export const metadata: Metadata = {
  title: "Prestations",
};

const AdminPrestationsListPage = () => <PrestationsEditor />;

export default AdminPrestationsListPage;

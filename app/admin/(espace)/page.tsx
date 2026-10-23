import type { Metadata } from "next";
import { Dashboard } from "./_components/dashboard";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

const AdminDashboardPage = () => <Dashboard />;

export default AdminDashboardPage;

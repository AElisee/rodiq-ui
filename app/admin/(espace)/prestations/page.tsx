import { redirect } from "next/navigation";

// Les prestations se gèrent par sous-menus : liste par catégorie par défaut
const AdminPrestationsPage = () => redirect("/admin/prestations/liste");

export default AdminPrestationsPage;

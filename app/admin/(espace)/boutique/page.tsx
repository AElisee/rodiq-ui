import { redirect } from "next/navigation";

// La boutique se gère par sous-menus : liste des produits par défaut
const AdminBoutiquePage = () => redirect("/admin/boutique/produits");

export default AdminBoutiquePage;

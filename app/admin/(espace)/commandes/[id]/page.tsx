import type { Metadata } from "next";
import { OrderDetails } from "../_components/order-details";

export const metadata: Metadata = {
  title: "Commande",
};

// Identifiant connu du navigateur seulement (données en localStorage) : rendu à la demande
export const instant = false;

const AdminOrderPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <OrderDetails id={decodeURIComponent(id)} />;
};

export default AdminOrderPage;

import type { Metadata } from "next";
import { OrderDetails } from "../_components/order-details";

export const metadata: Metadata = {
  title: "Commande",
};

// Commande lue par le navigateur avec la session admin (cookie) : rendu à la demande
export const instant = false;

const AdminOrderPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <OrderDetails id={decodeURIComponent(id)} />;
};

export default AdminOrderPage;

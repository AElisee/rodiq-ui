import type { Metadata } from "next";
import { OrdersManager } from "./_components/orders-manager";

export const metadata: Metadata = {
  title: "Commandes",
};

const AdminOrdersPage = () => <OrdersManager />;

export default AdminOrdersPage;

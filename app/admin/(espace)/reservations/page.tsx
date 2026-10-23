import type { Metadata } from "next";
import { ReservationsManager } from "./_components/reservations-manager";

export const metadata: Metadata = {
  title: "Réservations",
};

const AdminReservationsPage = () => <ReservationsManager />;

export default AdminReservationsPage;

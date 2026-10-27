import type { Metadata } from "next";
import { ReservationDetails } from "../_components/reservation-details";

export const metadata: Metadata = {
  title: "Réservation",
};

// Réservation lue par le navigateur avec la session admin (cookie) : rendu à la demande
export const instant = false;

const AdminReservationPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <ReservationDetails id={decodeURIComponent(id)} />;
};

export default AdminReservationPage;

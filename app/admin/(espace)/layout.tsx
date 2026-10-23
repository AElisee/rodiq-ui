import { AdminShell } from "./_components/admin-shell";

// Pages réservées à l'admin connecté : menu latéral + contrôle de la session
const AdminSpaceLayout = ({ children }: { children: React.ReactNode }) => <AdminShell>{children}</AdminShell>;

export default AdminSpaceLayout;

import type { Metadata } from "next";
import { UsersList } from "./_components/users-list";

export const metadata: Metadata = {
  title: "Clientèle",
};

const AdminUsersPage = () => <UsersList />;

export default AdminUsersPage;

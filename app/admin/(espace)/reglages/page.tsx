import type { Metadata } from "next";
import { SettingsEditor } from "./_components/settings-editor";

export const metadata: Metadata = {
  title: "Réglages",
};

const AdminSettingsPage = () => <SettingsEditor />;

export default AdminSettingsPage;

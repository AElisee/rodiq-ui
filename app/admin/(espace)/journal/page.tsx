import type { Metadata } from "next";
import { JournalList } from "./_components/journal-list";

export const metadata: Metadata = {
  title: "Journal",
};

const AdminJournalPage = () => <JournalList />;

export default AdminJournalPage;

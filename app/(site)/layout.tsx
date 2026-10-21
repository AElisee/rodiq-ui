import { Header } from "@/components/layout/header";

const SiteLayout = ({ children }: LayoutProps<"/">) => (
  <>
    <Header />
    <main className="flex flex-1 flex-col">{children}</main>
  </>
);

export default SiteLayout;

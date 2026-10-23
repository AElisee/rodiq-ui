import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Administration",
    template: "%s | Admin Rodiq",
  },
  // Espace de gestion : ne pas référencer
  robots: { index: false, follow: false },
};

const AdminLayout = ({ children }: LayoutProps<"/admin">) => (
  <>
    {children}
    <Toaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans",
          title: "font-serif text-base!",
          description: "text-taupe!",
          actionButton: "h-8! rounded-full! bg-cocoa! px-4! text-pearl! transition-colors hover:bg-taupe!",
        },
      }}
    />
  </>
);

export default AdminLayout;

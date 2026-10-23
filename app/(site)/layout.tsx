import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { VisitTracker } from "@/components/layout/visit-tracker";
import { Toaster } from "@/components/ui/sonner";

const SiteLayout = ({ children }: LayoutProps<"/">) => (
  <>
    <Header />
    <main className="flex flex-1 flex-col">{children}</main>
    <Footer />
    <VisitTracker />
    {/* Notifications (ajout au panier…) : couleurs déjà mappées sur la charte via le Toaster */}
    {/* Décalage = hauteur du header compact (après scroll) + une marge */}
    <Toaster
      position="top-right"
      offset={{ top: 112, right: 24 }}
      mobileOffset={{ top: 88, right: 16, left: 16 }}
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans",
          title: "font-serif text-base!",
          description: "text-taupe!",
          actionButton: "h-8! rounded-full! bg-blush! px-4! text-cocoa! transition-colors hover:bg-sand!",
        },
      }}
    />
  </>
);

export default SiteLayout;

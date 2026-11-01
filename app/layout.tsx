import type { Metadata } from "next";
import { preconnect } from "react-dom";
import { API_ORIGIN } from "@/lib/api/client";
import { archivo, geistMono, playfair } from "@/lib/fonts";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { NumberWheelGuard } from "@/components/layout/number-wheel-guard";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rodiq",
    template: "%s | Rodiq",
  },
  description: "Onglerie et soins des mains et des pieds à Abidjan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Connexion à l'API ouverte pendant le chargement de la page : sur un réseau lent, la première lecture
  // n'attend plus la résolution DNS ni la négociation TLS (mêmes cookies que les appels : use-credentials)
  preconnect(API_ORIGIN, { crossOrigin: "use-credentials" });

  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${playfair.variable} ${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavigationProgress />
        <NumberWheelGuard />
        {children}
      </body>
    </html>
  );
}

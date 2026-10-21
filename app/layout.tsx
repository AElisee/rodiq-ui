import type { Metadata } from "next";
import { archivo, geistMono, playfair } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rodiq",
    template: "%s | Rodiq",
  },
  description: "Onglerie et soins des mains et des pieds à Abidjan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${playfair.variable} ${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

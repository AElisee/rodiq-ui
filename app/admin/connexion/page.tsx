import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "./_components/admin-login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

// Connexion de l'équipe du salon (pas d'inscription : les comptes admin sont créés par RODIQ)
const AdminConnexionPage = () => (
  <main className="flex min-h-svh flex-1 items-center justify-center bg-sand px-4 py-16">
    <div className="w-full max-w-md rounded-[var(--radius)] bg-pearl p-8 shadow-sm md:p-10">
      <p className="text-center font-serif text-5xl leading-none text-cocoa">Rodiq</p>
      <p className="mt-3 text-center font-sans text-xs tracking-[0.3em] text-taupe uppercase">
        Administration
      </p>

      {/* Le formulaire lit ?redirect= dans l'URL : rendu côté navigateur */}
      <Suspense fallback={<div className="min-h-72" aria-hidden />}>
        <AdminLoginForm />
      </Suspense>
    </div>
  </main>
);

export default AdminConnexionPage;

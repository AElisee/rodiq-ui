import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createHydrationHook } from "./hydration";

type AdminState = {
  email: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => void;
};

// Maquette uniquement : l'authentification de l'admin se fera côté serveur
const hashPassword = async (password: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
};

// Compte admin de démonstration : admin@rodiq.ci / admin2026 (pas d'inscription possible)
const ADMIN_EMAIL = "admin@rodiq.ci";
const ADMIN_PASSWORD_HASH = "6051fc84a7a0d74c225fb18a496b09952da5642e60723ecae543298edd7d82d6";

// Session de l'admin, séparée de celle des clientes
export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      email: null,
      signIn: async (email, password) => {
        const ok =
          email.trim().toLowerCase() === ADMIN_EMAIL &&
          (await hashPassword(password)) === ADMIN_PASSWORD_HASH;
        if (ok) set({ email: ADMIN_EMAIL });
        return ok;
      },
      signOut: () => set({ email: null }),
    }),
    {
      name: "rodiq-admin",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export const useAdminHydrated = createHydrationHook(useAdminStore);

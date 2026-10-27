import { create } from "zustand";
import { adminAuthApi } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/client";
import { createLoadHook } from "./remote";

type AdminState = {
  email: string | null;
  // Vrai une fois la session admin vérifiée auprès de l'API (GET /admin/me)
  checked: boolean;
  restore: () => Promise<void>;
  // Erreurs autres qu'« identifiants incorrects » : ApiError levée
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  // Session expirée côté serveur (401 sur une route admin) : l'espace admin renvoie vers la connexion
  expire: () => void;
};

// Session de l'admin, séparée de celle des clients (cookie rodiq_admin_session, 8 h sans activité)
export const useAdminStore = create<AdminState>()((set) => ({
  email: null,
  checked: false,
  restore: async () => {
    try {
      const { email } = await adminAuthApi.me();
      set({ email, checked: true });
    } catch {
      set({ email: null, checked: true });
    }
  },
  signIn: async (email, password) => {
    try {
      const admin = await adminAuthApi.signIn(email, password);
      set({ email: admin.email, checked: true });
      return true;
    } catch (error) {
      if (isApiError(error, 401)) return false;
      throw error;
    }
  },
  signOut: async () => {
    try {
      await adminAuthApi.signOut();
    } catch {
      // Session déjà fermée ou serveur injoignable : on déconnecte quand même l'interface
    }
    set({ email: null });
  },
  expire: () => set({ email: null }),
}));

// Vrai une fois la session admin vérifiée auprès de l'API
export const useAdminHydrated = createLoadHook(useAdminStore, (s) => s.checked, () => useAdminStore.getState().restore());

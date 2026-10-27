import { create } from "zustand";
import { authApi, type SignUpBody } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/client";
import { ensureHydrated } from "./hydration";
import { useOrderStore } from "./order-store";
import { useReservationStore } from "./reservation-store";
import { createLoadHook } from "./remote";

export type Account = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string; // +225 07 00 00 00 00
  whatsapp?: string;
  email: string;
  createdAt: string; // ISO
};

export type SignUpData = SignUpBody;

type AuthState = {
  account: Account | null;
  // Vrai une fois la session vérifiée auprès de l'API (GET /me)
  checked: boolean;
  restore: () => Promise<void>;
  // Erreurs autres qu'« e-mail déjà utilisé » / « identifiants incorrects » : ApiError levée
  signUp: (data: SignUpData) => Promise<{ ok: true } | { ok: false; error: "email_taken" }>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

// Historique passé sans compte (même e-mail) rattaché au nouveau compte.
// Maquette : réservations et commandes sont encore dans le navigateur, le serveur le fera à l'inscription.
const linkGuestHistory = async (accountId: string, email: string) => {
  await Promise.all([ensureHydrated(useReservationStore), ensureHydrated(useOrderStore)]);
  useReservationStore.getState().claim(accountId, email);
  useOrderStore.getState().claim(accountId, email);
};

// Session du client : le cookie httpOnly est géré par le navigateur, le store garde le compte connecté
export const useAuthStore = create<AuthState>()((set) => ({
  account: null,
  checked: false,
  restore: async () => {
    try {
      set({ account: await authApi.me(), checked: true });
    } catch {
      // 401 (pas de session) ou serveur injoignable : visiteur non connecté
      set({ account: null, checked: true });
    }
  },
  signUp: async (data) => {
    try {
      const account = await authApi.signUp(data);
      set({ account, checked: true });
      await linkGuestHistory(account.id, account.email);
      return { ok: true };
    } catch (error) {
      if (isApiError(error, 409)) return { ok: false, error: "email_taken" };
      throw error;
    }
  },
  signIn: async (email, password) => {
    try {
      set({ account: await authApi.signIn(email, password), checked: true });
      return true;
    } catch (error) {
      if (isApiError(error, 401)) return false;
      throw error;
    }
  },
  signOut: async () => {
    try {
      await authApi.signOut();
    } catch {
      // Session déjà fermée ou serveur injoignable : on déconnecte quand même l'interface
    }
    set({ account: null });
  },
}));

export const selectCurrentAccount = (s: AuthState) => s.account;

export const selectCurrentAccountId = (s: AuthState) => s.account?.id ?? null;

// Vrai une fois la session vérifiée auprès de l'API
export const useAuthHydrated = createLoadHook(useAuthStore, (s) => s.checked, () => useAuthStore.getState().restore());

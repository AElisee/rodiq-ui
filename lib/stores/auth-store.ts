import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { demoClientAccounts } from "@/lib/demo-data";
import { createHydrationHook, ensureHydrated } from "./hydration";
import { useOrderStore } from "./order-store";
import { useReservationStore } from "./reservation-store";

export type Account = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string; // +225 07 00 00 00 00
  whatsapp?: string;
  email: string;
  passwordHash: string;
  createdAt: string; // ISO
};

export type SignUpData = Omit<Account, "id" | "passwordHash" | "createdAt"> & { password: string };

type AuthState = {
  accounts: Account[];
  currentAccountId: string | null;
  signUp: (data: SignUpData) => Promise<{ ok: true } | { ok: false; error: "email_taken" }>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => void;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Maquette uniquement : le vrai hachage se fera côté serveur
const hashPassword = async (password: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
};

// Historique passé sans compte (même e-mail) rattaché au nouveau compte.
const linkGuestHistory = async (accountId: string, email: string) => {
  await Promise.all([ensureHydrated(useReservationStore), ensureHydrated(useOrderStore)]);
  useReservationStore.getState().claim(accountId, email);
  useOrderStore.getState().claim(accountId, email);
};

// Compte de démonstration : aicha.kone@exemple.ci / rodiq2026
const demoAccount: Account = {
  id: "demo-account",
  firstName: "Aïcha",
  lastName: "Koné",
  phone: "+225 07 00 00 00 00",
  email: "aicha.kone@exemple.ci",
  passwordHash: "6feafd144aeefc2dd973df73378d6a7bc5c52a5e1987517fa60059251e27ca5a",
  createdAt: "2026-09-01T10:00:00.000Z",
};

// Comptes clientes et session (maquette : conservés dans le navigateur en attendant l'API).
// Hydratation manuelle (skipHydration) pour éviter un écart serveur / client.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accounts: [demoAccount, ...demoClientAccounts],
      currentAccountId: null,
      signUp: async ({ password, ...data }) => {
        const email = normalizeEmail(data.email);
        if (get().accounts.some((a) => a.email === email)) return { ok: false, error: "email_taken" };

        const account: Account = {
          ...data,
          email,
          id: crypto.randomUUID(),
          passwordHash: await hashPassword(password),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ accounts: [...s.accounts, account], currentAccountId: account.id }));
        await linkGuestHistory(account.id, email);
        return { ok: true };
      },
      signIn: async (email, password) => {
        const passwordHash = await hashPassword(password);
        const account = get().accounts.find(
          (a) => a.email === normalizeEmail(email) && a.passwordHash === passwordHash,
        );
        if (account) set({ currentAccountId: account.id });
        return !!account;
      },
      signOut: () => set({ currentAccountId: null }),
    }),
    {
      name: "rodiq-auth",
      // v1 : ajout des clientes de démonstration pour l'admin
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Pick<AuthState, "accounts" | "currentAccountId">;
        if (version < 1) {
          const ids = new Set(state.accounts.map((a) => a.id));
          state.accounts = [...state.accounts, ...demoClientAccounts.filter((a) => !ids.has(a.id))];
        }
        return state as AuthState;
      },
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export const selectCurrentAccount = (s: AuthState) =>
  s.accounts.find((a) => a.id === s.currentAccountId) ?? null;

export const selectEmailTaken = (email: string | undefined) => (s: AuthState) =>
  !!email && s.accounts.some((a) => a.email === normalizeEmail(email));

// Vrai une fois les comptes et la session relus depuis le localStorage
export const useAuthHydrated = createHydrationHook(useAuthStore);

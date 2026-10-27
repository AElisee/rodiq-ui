import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

// Authentification des clients et de l'admin (routes en anglais, comme côté API)

// Compte renvoyé par l'API (AccountDto)
type AccountDto = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string | null;
  email: string;
  createdAt: string;
};

type AdminDto = { id: string; email: string };

export type ApiAccount = Omit<AccountDto, "whatsapp"> & { whatsapp?: string };

export type SignUpBody = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp?: string;
  email: string;
  password: string;
};

// Le jeton (`token`) des réponses de connexion est ignoré : le navigateur garde le cookie httpOnly
const toAccount = ({ id, firstName, lastName, phone, whatsapp, email, createdAt }: AccountDto): ApiAccount => ({
  id,
  firstName,
  lastName,
  phone,
  whatsapp: whatsapp ?? undefined,
  email,
  createdAt,
});

export const authApi = {
  signUp: async (body: SignUpBody) =>
    toAccount(await apiRequest<AccountDto>(endpoints.auth.signUp, { method: "POST", body })),
  signIn: async (email: string, password: string) =>
    toAccount(await apiRequest<AccountDto>(endpoints.auth.signIn, { method: "POST", body: { email, password } })),
  signOut: () => apiRequest<void>(endpoints.auth.signOut, { method: "POST" }),
  me: async () => toAccount(await apiRequest<AccountDto>(endpoints.auth.me)),
};

export const adminAuthApi = {
  signIn: async (email: string, password: string) => {
    const { id, email: adminEmail } = await apiRequest<AdminDto>(endpoints.adminAuth.signIn, {
      method: "POST",
      body: { email, password },
    });
    return { id, email: adminEmail };
  },
  signOut: () => apiRequest<void>(endpoints.adminAuth.signOut, { method: "POST" }),
  me: () => apiRequest<AdminDto>(endpoints.adminAuth.me),
};

import { z } from "zod";

// Règles de saisie partagées par les formulaires clientes (réservation, inscription, connexion)

export const PASSWORD_MIN_LENGTH = 8;

// Numéros ivoiriens : indicatif +225 suivi de 10 chiffres
export const CI_DIAL_CODE = "+225";
export const PHONE_DIGITS = 10;

// Ne garde que les chiffres (10 au plus), groupés deux par deux : 07 00 00 00 00
export const formatPhone = (raw: string) => {
  let digits = raw.replace(/\D/g, "");
  // Numéro collé avec son indicatif (+225 07 …)
  if (digits.length > PHONE_DIGITS && digits.startsWith("225")) digits = digits.slice(3);
  return digits.slice(0, PHONE_DIGITS).replace(/(\d{2})(?=\d)/g, "$1 ");
};

export const withDialCode = (phone: string) => `${CI_DIAL_CODE} ${phone}`;

export const phoneSchema = z
  .string()
  .refine(
    (v) => v.replace(/\D/g, "").length === PHONE_DIGITS,
    `Le numéro doit comporter ${PHONE_DIGITS} chiffres`,
  );

// Écarte les saisies au hasard (« xkcdfg », « aeiouu ») : 3 voyelles ou 3 consonnes d'affilée au plus
const hasLetterRun = (value: string) =>
  /[aeiouy]{4,}|[bcdfghjklmnpqrstvwxz]{4,}/.test(
    value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(),
  );

export const textSchema = (min: number, message: string, invalidMessage: string) =>
  z.string().trim().min(min, message).refine((v) => !hasLetterRun(v), invalidMessage);

// Prénom / nom : lettres (accents compris), espaces, tirets et apostrophes (N'Guessan, Marie-Laure)
export const nameSchema = (message: string, invalidMessage: string) =>
  textSchema(2, message, invalidMessage).regex(/^\p{L}+(?:[\s'’-]\p{L}+)*$/u, invalidMessage);

export const emailSchema = z
  .email("Adresse e-mail invalide")
  .refine((v) => !hasLetterRun(v), "Entrer un e-mail correct");

export const optionalEmailSchema = z.union([z.literal(""), emailSchema]);

// Évite les redirections vers un autre site après connexion (?redirect=//exemple.com)
export const safeRedirect = (value: string | null, fallback: string) =>
  value?.startsWith("/") && !value.startsWith("//") ? value : fallback;

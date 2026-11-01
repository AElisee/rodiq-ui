// Client HTTP de l'API RODIQ : seul endroit qui connaît l'URL de base, les cookies et le format des erreurs.
// Les services (`lib/api/*.ts`) s'appuient dessus ; les composants n'appellent jamais `fetch` directement.

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

// Adresse complète d'un fichier servi par l'API (photo de produit) : l'API renvoie des chemins relatifs à
// son origine (`/api/boutique/photos/…`)
export const apiFileUrl = (path: string) => new URL(path, API_URL).href;

// Origine de l'API, pour ouvrir la connexion (DNS, TLS) dès le chargement de la page
export const API_ORIGIN = new URL(API_URL).origin;

// Erreur renvoyée par l'API ({ statusCode, message, error }) ou serveur injoignable / trop lent (status 0)
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly messages: string[],
  ) {
    super(messages[0] ?? `Erreur ${status}`);
    this.name = "ApiError";
  }
}

export const isApiError = (error: unknown, status?: number): error is ApiError =>
  error instanceof ApiError && (status === undefined || error.status === status);

// Message à afficher dans un toast, quelle que soit l'erreur : dit ce qui s'est réellement passé
export const errorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    // Erreur du navigateur (code du front), pas une réponse du serveur
    const detail = error instanceof Error && error.message ? ` : ${error.message}` : "";
    return `Erreur inattendue dans la page${detail}`;
  }
  if (error.status === 0) {
    return error.messages[0] ?? "Serveur injoignable : vérifiez votre connexion internet ou réessayez dans quelques instants";
  }
  if (error.status === 429) return "Trop de tentatives en peu de temps : réessayez dans une minute";
  if (error.status >= 500) {
    return `Erreur interne du serveur (${error.status}) : la demande n'a pas abouti, réessayez plus tard`;
  }
  if (error.messages.length === 0) return `Demande refusée par le serveur (erreur ${error.status})`;
  return error.messages.join(" · ");
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

// En dev, chaque appel est tracé dans la console (renvoyée au terminal de `pnpm dev` par `logging.browserToTerminal`)
const logRequest = (method: string, path: string, status: number | string, start: number) => {
  if (process.env.NODE_ENV !== "development") return;
  console.log(`[api] ${method} ${path} → ${status} (${Math.round(performance.now() - start)} ms)`);
};

// Lectures (GET) sur une connexion faible ou pendant le réveil de l'API par Passenger : une tentative qui
// n'a pas répondu à temps est abandonnée, et une lecture échouée (réseau coupé, délai dépassé, 502/503/504
// du proxy) est relancée après ces pauses. Une écriture n'est jamais relancée ni coupée : elle a pu
// aboutir côté serveur sans que la réponse arrive
const READ_TIMEOUT = 15_000;
const READ_RETRY_DELAYS = [1_000, 3_000];
const RETRYABLE_STATUSES = [502, 503, 504];

const TIMEOUT_MESSAGE = "Le serveur met trop de temps à répondre : vérifiez votre connexion internet ou réessayez dans quelques instants";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const send = async (method: string, path: string, body: unknown): Promise<Response> => {
  const start = performance.now();
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      // Cookies de session httpOnly posés par l'API (rodiq_session, rodiq_admin_session)
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: method === "GET" ? AbortSignal.timeout(READ_TIMEOUT) : undefined,
    });
    logRequest(method, path, response.status, start);
    return response;
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    logRequest(method, path, timedOut ? "délai dépassé" : "injoignable", start);
    throw new ApiError(0, timedOut ? [TIMEOUT_MESSAGE] : []);
  }
};

const sendWithRetries = async (method: string, path: string, body: unknown): Promise<Response> => {
  for (const delay of method === "GET" ? READ_RETRY_DELAYS : []) {
    try {
      const response = await send(method, path, body);
      if (!RETRYABLE_STATUSES.includes(response.status)) return response;
    } catch (error) {
      if (!isApiError(error, 0)) throw error;
    }
    await wait(delay);
  }
  return send(method, path, body);
};

export const apiRequest = async <T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> => {
  const response = await sendWithRetries(method, path, body);

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => undefined);
  // Réponse réussie mais corps non JSON (proxy, page d'erreur HTML…) : inutilisable
  if (response.ok && data === undefined) {
    throw new ApiError(response.status, ["Le serveur a renvoyé une réponse illisible"]);
  }
  if (!response.ok) {
    const message = (data as { message?: string | string[] } | undefined)?.message;
    throw new ApiError(response.status, Array.isArray(message) ? message : message ? [message] : []);
  }
  return data as T;
};

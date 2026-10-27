// Client HTTP de l'API RODIQ : seul endroit qui connaît l'URL de base, les cookies et le format des erreurs.
// Les services (`lib/api/*.ts`) s'appuient dessus ; les composants n'appellent jamais `fetch` directement.

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

// Erreur renvoyée par l'API ({ statusCode, message, error }) ou serveur injoignable (status 0)
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
  if (error.status === 0) return "Serveur injoignable : votre connexion est coupée ou l'API ne répond pas";
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

export const apiRequest = async <T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> => {
  const start = performance.now();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      // Cookies de session httpOnly posés par l'API (rodiq_session, rodiq_admin_session)
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    logRequest(method, path, "injoignable", start);
    throw new ApiError(0, []);
  }
  logRequest(method, path, response.status, start);

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

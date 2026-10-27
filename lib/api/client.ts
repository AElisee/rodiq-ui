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

// Message à afficher dans un toast, quelle que soit l'erreur
export const errorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) return "Une erreur inattendue est survenue";
  if (error.status === 0) return "Serveur injoignable : vérifiez votre connexion";
  if (error.status === 429) return "Trop de tentatives : réessayez dans une minute";
  if (error.status >= 500) return "Le serveur a rencontré un problème, réessayez plus tard";
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
  if (!response.ok) {
    const message = (data as { message?: string | string[] } | undefined)?.message;
    throw new ApiError(response.status, Array.isArray(message) ? message : message ? [message] : []);
  }
  return data as T;
};

import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

// Visiteurs du site : uniques par jour, reconnus par l'API sans cookie (empreinte anonyme du jour).
// L'API parle français (`jour`, `visiteurs`), le front garde ses noms : la traduction est faite ici seulement.

type VisitesJourDto = { jour: string; visiteurs: number };

export const visitesApi = {
  // Signale l'arrivée d'un visiteur ; l'API décide s'il est nouveau aujourd'hui (204 dans tous les cas)
  track: () => apiRequest<void>(endpoints.visites.comptage, { method: "POST" }),

  // Visiteurs par jour (yyyy-MM-dd) de `from` à `to` compris ; les jours sans visiteur sont absents
  list: async (from: string, to: string): Promise<Record<string, number>> => {
    const params = new URLSearchParams({ du: from, au: to });
    const days = await apiRequest<VisitesJourDto[]>(`${endpoints.visites.liste}?${params}`);
    return Object.fromEntries(days.map((d) => [d.jour, d.visiteurs]));
  },
};

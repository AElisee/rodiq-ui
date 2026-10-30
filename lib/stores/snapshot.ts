// Dernière réponse de l'API gardée dans le navigateur pour les données publiques (réglages, carte des
// prestations, catégories de la boutique) : affichée tout de suite à la visite suivante, puis remplacée
// par la lecture de l'API dès qu'elle répond. Jamais une source de vérité : prix, créneaux et stock sont
// revérifiés par l'API à la réservation et à la commande.

// À incrémenter quand la forme des données gardées change : les anciennes copies sont ignorées
const VERSION = 1;
const prefix = "rodiq-copie:";

export const readSnapshot = <T>(key: string): T | undefined => {
  try {
    const raw = localStorage.getItem(prefix + key);
    if (!raw) return undefined;
    const { v, data } = JSON.parse(raw) as { v: number; data: T };
    return v === VERSION ? data : undefined;
  } catch {
    // Stockage bloqué (navigation privée) ou copie illisible : on attend l'API
    return undefined;
  }
};

export const writeSnapshot = (key: string, data: unknown) => {
  try {
    localStorage.setItem(prefix + key, JSON.stringify({ v: VERSION, data }));
  } catch {
    // Stockage plein ou bloqué : la copie est facultative
  }
};

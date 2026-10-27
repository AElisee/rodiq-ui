// Chemins de l'API, relatifs au préfixe /api : à modifier ici seulement si une route change côté serveur
export const endpoints = {
  auth: {
    signUp: "/auth/sign-up",
    signIn: "/auth/sign-in",
    signOut: "/auth/sign-out",
    me: "/me",
  },
  adminAuth: {
    signIn: "/admin/auth/sign-in",
    signOut: "/admin/auth/sign-out",
    me: "/admin/me",
  },
  parametres: {
    lecture: "/parametres",
    creation: "/admin/parametres",
    plateforme: "/admin/parametres/plateforme",
    logo: (variante: string) => `/admin/parametres/logos/${variante}`,
    horaires: "/admin/parametres/horaires",
    regles: "/admin/parametres/regles",
    fermetures: "/admin/parametres/fermetures",
    fermeture: (date: string) => `/admin/parametres/fermetures/${date}`,
    salon: "/admin/parametres/salon",
    livraisons: "/admin/parametres/livraisons",
  },
  prestations: {
    lecture: "/prestations",
    categories: "/admin/prestations/categories",
    categorie: (id: string) => `/admin/prestations/categories/${encodeURIComponent(id)}`,
    ordreCategories: "/admin/prestations/categories/ordre",
    ordrePrestations: (categoryId: string) =>
      `/admin/prestations/categories/${encodeURIComponent(categoryId)}/ordre`,
    creation: "/admin/prestations",
    prestation: (id: string) => `/admin/prestations/${encodeURIComponent(id)}`,
  },
} as const;

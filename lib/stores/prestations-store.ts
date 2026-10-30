import { useMemo } from "react";
import { create } from "zustand";
import { errorMessage, isApiError } from "@/lib/api/client";
import { type CategoryFields, type PrestationFields, prestationsApi } from "@/lib/api/prestations";
import type { PrestationCategory } from "@/lib/prestations";
import { useAdminStore } from "./admin-store";
import { createLoadHook } from "./remote";
import { readSnapshot, writeSnapshot } from "./snapshot";

const SNAPSHOT_KEY = "prestations";

// Actions de l'admin : chacune enregistre côté API puis reprend la carte renvoyée.
// En cas d'échec, l'ApiError est levée (le composant affiche le message) et l'état ne change pas.
type PrestationsState = {
  // Catégories dans l'ordre d'affichage, chacune avec ses prestations dans l'ordre
  categories: PrestationCategory[];
  // Vrai une fois la première lecture terminée, réussie ou non
  loaded: boolean;
  // Raison de l'échec de la dernière lecture : la carte affichée est alors vide ou périmée
  loadError: string | undefined;
  load: () => Promise<void>;
  // Sans identifiant : ajout ; sinon modification du nom et de l'accroche
  savePrestationCategory: (fields: CategoryFields, id?: string) => Promise<void>;
  removePrestationCategory: (id: string) => Promise<void>;
  // Avance (-1) ou recule (+1) la catégorie dans l'ordre d'affichage
  movePrestationCategory: (id: string, offset: -1 | 1) => Promise<void>;
  // Sans identifiant : ajout ; sinon modification (et éventuellement changement de catégorie)
  savePrestation: (categoryId: string, fields: PrestationFields, id?: string) => Promise<void>;
  removePrestation: (id: string) => Promise<void>;
  // Avance (-1) ou recule (+1) la prestation dans l'ordre d'affichage de sa catégorie
  movePrestation: (id: string, offset: -1 | 1) => Promise<void>;
};

// Échange l'identifiant avec son voisin (offset -1 : précédent, +1 : suivant) ; undefined en bout de liste
const swapped = (ids: string[], id: string, offset: -1 | 1) => {
  const index = ids.indexOf(id);
  const target = index + offset;
  if (index === -1 || target < 0 || target >= ids.length) return undefined;
  return ids.with(index, ids[target]).with(target, ids[index]);
};

// Carte des prestations modifiée depuis l'admin et lue par le site (page Prestations, réservation).
// Source : l'API (`lib/api/prestations.ts`).
export const usePrestationsStore = create<PrestationsState>()((set, get) => {
  // Écriture admin : remplace la carte par celle renvoyée ; session expirée → retour à la connexion.
  // Refus 400 / 404 / 409 : la carte affichée a pu être modifiée ailleurs, on la relit
  const save = async (request: () => Promise<PrestationCategory[]>) => {
    try {
      set({ categories: await request() });
    } catch (error) {
      if (isApiError(error, 401)) useAdminStore.getState().expire();
      else if (isApiError(error, 400) || isApiError(error, 404) || isApiError(error, 409)) void get().load();
      throw error;
    }
  };

  return {
    categories: [],
    loaded: false,
    loadError: undefined,
    load: async () => {
      // Copie de la visite précédente affichée tout de suite, en attendant l'API
      const snapshot = get().loaded ? undefined : readSnapshot<PrestationCategory[]>(SNAPSHOT_KEY);
      if (snapshot) set({ categories: snapshot, loaded: true });
      try {
        const categories = await prestationsApi.list();
        set({ categories, loaded: true, loadError: undefined });
        writeSnapshot(SNAPSHOT_KEY, categories);
      } catch (error) {
        console.error("Lecture de la carte des prestations impossible", error);
        // Copie affichée : on la garde (les prix sont repris du catalogue par l'API à la réservation)
        set({ loaded: true, loadError: snapshot ? undefined : errorMessage(error) });
      }
    },
    savePrestationCategory: (fields, id) =>
      save(() => (id ? prestationsApi.updateCategory(id, fields) : prestationsApi.createCategory(fields))),
    removePrestationCategory: (id) => save(() => prestationsApi.removeCategory(id)),
    movePrestationCategory: async (id, offset) => {
      const ids = swapped(
        get().categories.map((c) => c.id),
        id,
        offset,
      );
      if (ids) await save(() => prestationsApi.orderCategories(ids));
    },
    savePrestation: (categoryId, fields, id) =>
      save(() =>
        id
          ? prestationsApi.updatePrestation(id, categoryId, fields)
          : prestationsApi.createPrestation(categoryId, fields),
      ),
    removePrestation: (id) => save(() => prestationsApi.removePrestation(id)),
    movePrestation: async (id, offset) => {
      const category = get().categories.find((c) => c.prestations.some((p) => p.id === id));
      const ids = category && swapped(category.prestations.map((p) => p.id), id, offset);
      if (category && ids) await save(() => prestationsApi.orderPrestations(category.id, ids));
    },
  };
});

// Vrai une fois la carte lue depuis l'API (ou l'échec constaté : voir `loadError`)
export const usePrestationsHydrated = createLoadHook(
  usePrestationsStore,
  (s) => s.loaded,
  () => usePrestationsStore.getState().load(),
);

// Hooks de lecture pour le site : déclenchent la lecture de la carte

export const usePrestationCategories = () => {
  usePrestationsHydrated();
  return usePrestationsStore((s) => s.categories);
};

export const useAllPrestations = () => {
  const categories = usePrestationCategories();
  return useMemo(() => categories.flatMap((c) => c.prestations), [categories]);
};

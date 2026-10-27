import { useEffect } from "react";
import type { StoreApi, UseBoundStore } from "zustand";

// Crée un hook « vrai une fois l'état chargé depuis l'API » pour un store alimenté par l'API.
// Le premier composant qui l'utilise lance le chargement ; les suivants réutilisent la même requête.
export const createLoadHook = <S>(
  useStore: UseBoundStore<StoreApi<S>>,
  isLoaded: (state: S) => boolean,
  load: () => Promise<void>,
) => {
  let pending: Promise<void> | undefined;

  return () => {
    const loaded = useStore(isLoaded);

    useEffect(() => {
      pending ??= load();
    }, []);

    return loaded;
  };
};

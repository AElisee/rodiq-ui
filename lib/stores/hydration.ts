import { useEffect, useSyncExternalStore } from "react";

type PersistApi = {
  hasHydrated: () => boolean;
  rehydrate: () => Promise<void> | void;
  onFinishHydration: (listener: () => void) => () => void;
};

// Crée un hook « vrai une fois le store relu depuis le navigateur » pour un store persisté
// en hydratation manuelle (skipHydration). Relance la lecture si personne ne l'a faite
// (store recréé par le Fast Refresh, composant qui la déclenche absent…).
export const createHydrationHook = (store: { persist?: PersistApi }) => {
  // Côté serveur (pas de stockage navigateur), zustand n'attache pas l'API persist
  const subscribe = (onChange: () => void) => store.persist?.onFinishHydration(onChange) ?? (() => {});
  const getHydrated = () => store.persist?.hasHydrated() ?? false;

  return () => {
    const hydrated = useSyncExternalStore(subscribe, getHydrated, () => false);

    useEffect(() => {
      if (!store.persist?.hasHydrated()) store.persist?.rehydrate();
    }, []);

    return hydrated;
  };
};

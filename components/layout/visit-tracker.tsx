"use client";

import { useEffect } from "react";
import { useVisitStore, useVisitsHydrated } from "@/lib/stores/visit-store";

// Compte la visite (une fois par session) pour les statistiques de l'admin
export const VisitTracker = () => {
  const hydrated = useVisitsHydrated();

  useEffect(() => {
    if (hydrated) useVisitStore.getState().track();
  }, [hydrated]);

  return null;
};

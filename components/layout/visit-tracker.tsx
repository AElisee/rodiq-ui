"use client";

import { useEffect } from "react";
import { useVisitStore } from "@/lib/stores/visit-store";

// Signale la visite à l'API (une fois par session) pour les statistiques de l'admin.
// Navigateur piloté par un robot (tests, aspirateurs) : jamais compté
export const VisitTracker = () => {
  useEffect(() => {
    if (!navigator.webdriver) void useVisitStore.getState().track();
  }, []);

  return null;
};

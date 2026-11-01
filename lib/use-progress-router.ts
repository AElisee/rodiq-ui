"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { startNavigationProgress } from "@/components/layout/navigation-progress";

// useRouter de Next, dont push et replace affichent la barre de chargement comme un clic sur un lien
export const useProgressRouter = () => {
  const router = useRouter();
  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        startNavigationProgress(args[0]);
        router.push(...args);
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        startNavigationProgress(args[0]);
        router.replace(...args);
      },
    }),
    [router]
  );
};

"use client";

import { useEffect, useState } from "react";
import { Shimmer } from "@/components/ui/shimmer";

// Délais au-delà desquels un chargement est jugé lent, puis très lent (l'API relance alors ses lectures)
const SLOW_AFTER = 4_000;
const VERY_SLOW_AFTER = 15_000;

// Sous un squelette qui dure : dit que le chargement continue, pour qu'on n'abandonne pas la page
export const SlowLoadingNote = () => {
  const [stage, setStage] = useState<"normal" | "slow" | "verySlow">("normal");

  useEffect(() => {
    const slow = setTimeout(() => setStage("slow"), SLOW_AFTER);
    const verySlow = setTimeout(() => setStage("verySlow"), VERY_SLOW_AFTER);
    return () => {
      clearTimeout(slow);
      clearTimeout(verySlow);
    };
  }, []);

  if (stage === "normal") return null;

  return (
    <p className="animate-in py-3 text-center font-sans text-sm fade-in duration-500">
      <Shimmer>
        {stage === "slow"
          ? "Le chargement prend plus de temps que d'habitude…"
          : "Connexion lente : nous continuons d'essayer, merci de patienter…"}
      </Shimmer>
    </p>
  );
};

"use client";

import { useEffect } from "react";

// La molette ou le pavé tactile ne modifie pas un champ number : il perd le focus et la page défile
export const NumberWheelGuard = () => {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement && target.type === "number" && target === document.activeElement) {
        target.blur();
      }
    };
    document.addEventListener("wheel", onWheel, { capture: true, passive: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  return null;
};

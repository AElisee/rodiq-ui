import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api/client";

// Enregistrement d'un onglet des réglages : bouton désactivé pendant l'appel, message d'erreur de l'API sinon
export const useSave = () => {
  const [saving, setSaving] = useState(false);

  const run = async (action: () => Promise<void>, onSuccess: () => void) => {
    setSaving(true);
    try {
      await action();
      onSuccess();
    } catch (error) {
      toast.error("Enregistrement impossible", { description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return { saving, run };
};

"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AdminPanel,
  AdminPanelTitle,
  adminButtonClassName,
  adminInputClassName,
  adminSmallOutlineButtonClassName,
  PendingLabel,
} from "@/components/admin/admin-ui";
import { FieldError } from "@/components/forms/form-fields";
import type { ShippingRate } from "@/lib/commandes";
import { useSettingsStore, type ShippingSettings } from "@/lib/stores/settings-store";
import { useSave } from "./use-save";

type RateDraft = { place: string; fee: string };

const toDraft = (rates: ShippingRate[]): RateDraft[] => rates.map((r) => ({ place: r.place, fee: String(r.fee) }));

const toRates = (draft: RateDraft[]): ShippingRate[] =>
  draft.map((r) => ({ place: r.place.trim(), fee: Number(r.fee) }));

const rateErrors = (draft: RateDraft[], index: number) => {
  const { place, fee } = draft[index];
  const name = place.trim();
  const value = Number(fee);
  return {
    place: !name
      ? "Indiquez la destination"
      : draft.some((r, i) => i < index && r.place.trim().toLowerCase() === name.toLowerCase())
      ? "Destination en double"
      : undefined,
    fee: fee === "" || !Number.isInteger(value) || value < 0 ? "Indiquez un montant valide" : undefined,
  };
};

const sections: { key: keyof ShippingSettings; title: string; description: string; placeholder: string; empty: string }[] = [
  {
    key: "delivery",
    title: "Livraison à domicile",
    description: "Communes d'Abidjan et environs livrées par coursier, avec leurs frais de livraison.",
    placeholder: "Cocody, Angré…",
    empty: "Aucune commune livrée.",
  },
  {
    key: "expedition",
    title: "Expédition",
    description: "Villes de l'intérieur du pays desservies par expédition, avec leurs frais d'envoi.",
    placeholder: "Bouaké, Yamoussoukro…",
    empty: "Aucune ville desservie par expédition.",
  },
];

// Liste éditable des destinations et de leurs tarifs
const RatesList = ({
  section,
  draft,
  onChange,
}: {
  section: (typeof sections)[number];
  draft: RateDraft[];
  onChange: (draft: RateDraft[]) => void;
}) => {
  const update = (index: number, changes: Partial<RateDraft>) =>
    onChange(draft.map((r, i) => (i === index ? { ...r, ...changes } : r)));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-serif text-lg text-cocoa">{section.title}</h3>
        <p className="mt-1 font-sans text-sm text-taupe">{section.description}</p>
      </div>

      {draft.length > 0 ? (
        <ul className="divide-y divide-sand border-y border-sand font-sans text-sm text-cocoa">
          {draft.map((rate, index) => {
            const errors = rateErrors(draft, index);
            return (
              <li key={index} className="grid gap-3 py-3 sm:grid-cols-[1fr_12rem_auto] sm:items-start">
                <div>
                  <input
                    value={rate.place}
                    onChange={(e) => update(index, { place: e.target.value })}
                    placeholder={section.placeholder}
                    aria-label={`${section.title} : destination ${index + 1}`}
                    aria-invalid={!!errors.place}
                    className={adminInputClassName}
                  />
                  <FieldError message={errors.place} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={rate.fee}
                      onChange={(e) => update(index, { fee: e.target.value })}
                      aria-label={`${section.title} : tarif de ${rate.place || `la destination ${index + 1}`}`}
                      aria-invalid={!!errors.fee}
                      className={adminInputClassName}
                    />
                    <span className="text-taupe">FCFA</span>
                  </div>
                  <FieldError message={errors.fee} />
                </div>
                <button
                  type="button"
                  onClick={() => onChange(draft.filter((_, i) => i !== index))}
                  aria-label={`Supprimer ${rate.place || `la destination ${index + 1}`}`}
                  className="inline-flex size-8 items-center justify-center self-center rounded-full text-taupe transition-colors hover:bg-sand hover:text-cocoa"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="font-sans text-sm text-taupe">{section.empty}</p>
      )}

      <button
        type="button"
        onClick={() => onChange([...draft, { place: "", fee: "" }])}
        className={`${adminSmallOutlineButtonClassName} self-start`}
      >
        <Plus className="size-4" strokeWidth={1.75} />
        Ajouter une destination
      </button>
    </div>
  );
};

// Tarifs de livraison et d'expédition proposés au moment de la commande
export const ShippingSettingsForm = () => {
  const shipping = useSettingsStore((s) => s.shipping);
  const setShipping = useSettingsStore((s) => s.setShipping);
  const { saving, run } = useSave();
  const [draft, setDraft] = useState<Record<keyof ShippingSettings, RateDraft[]>>({
    delivery: toDraft(shipping.delivery),
    expedition: toDraft(shipping.expedition),
  });

  const invalid = sections.some(({ key }) =>
    draft[key].some((_, i) => Object.values(rateErrors(draft[key], i)).some(Boolean)),
  );
  // Une destination ne peut figurer que dans une seule liste
  const places = [...draft.delivery, ...draft.expedition].map((r) => r.place.trim().toLowerCase()).filter(Boolean);
  const crossDuplicate = new Set(places).size !== places.length && !invalid;
  const next: ShippingSettings = { delivery: toRates(draft.delivery), expedition: toRates(draft.expedition) };
  const changed = JSON.stringify(next) !== JSON.stringify(shipping);

  return (
    <AdminPanel className="flex flex-col gap-8">
      <div>
        <AdminPanelTitle>Livraisons et expéditions</AdminPanelTitle>
        <p className="mt-1 font-sans text-sm text-taupe">
          Destinations proposées dans le tunnel de commande de la boutique. Le retrait au salon reste gratuit.
        </p>
      </div>

      {sections.map((section) => (
        <RatesList
          key={section.key}
          section={section}
          draft={draft[section.key]}
          onChange={(rates) => setDraft((d) => ({ ...d, [section.key]: rates }))}
        />
      ))}

      <div className="flex flex-wrap items-center justify-end gap-4">
        {crossDuplicate ? (
          <FieldError message="Une même destination figure dans les deux listes" />
        ) : (
          changed && <p className="font-sans text-sm text-taupe">Modifications non enregistrées</p>
        )}
        <button
          type="button"
          disabled={!changed || invalid || crossDuplicate || saving}
          onClick={() =>
            run(
              () => setShipping(next),
              () => toast.success("Tarifs enregistrés", { description: "Le tunnel de commande est mis à jour." }),
            )
          }
          className={adminButtonClassName}
        >
          <PendingLabel pending={saving}>Enregistrer les tarifs</PendingLabel>
        </button>
      </div>
    </AdminPanel>
  );
};

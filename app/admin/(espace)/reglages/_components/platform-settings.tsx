"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AdminPanel,
  AdminPanelTitle,
  adminButtonClassName,
  adminInputClassName,
  adminLabelClassName,
  adminSmallOutlineButtonClassName,
} from "@/components/admin/admin-ui";
import { FieldError } from "@/components/forms/form-fields";
import { useSettingsStore, type LogoVariant, type PlatformInfo } from "@/lib/stores/settings-store";
import { useSave } from "./use-save";
import { cn } from "@/lib/utils";
import { CI_DIAL_CODE, emailSchema, formatPhone, phoneSchema, withDialCode } from "@/lib/validation";

type Draft = Omit<PlatformInfo, "logos">;
type TextField = Exclude<keyof Draft, "socials">;

const phoneFields = ["phone", "phoneSecondary", "whatsapp"] as const;
const isPhoneField = (key: TextField): key is (typeof phoneFields)[number] =>
  (phoneFields as readonly string[]).includes(key);

// Les numéros sont saisis sans indicatif (07 00 00 00 00) et enregistrés avec (+225 07 00 00 00 00)
const toDraft = (platform: PlatformInfo): Draft => {
  const draft: Partial<PlatformInfo> = { ...platform };
  delete draft.logos;
  for (const key of phoneFields) draft[key] = formatPhone(platform[key]);
  return draft as Draft;
};

const phoneError = (value: string, required = false) => {
  if (!value) return required ? "Indiquez un numéro" : undefined;
  return phoneSchema.safeParse(value).error?.issues[0].message;
};

const urlError = (value: string) =>
  !value.trim() || /^https?:\/\/\S+\.\S+/.test(value.trim()) ? undefined : "Lien invalide (https://…)";


const socialFields: { key: keyof Draft["socials"]; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/rodiq" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/rodiq" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@rodiq" },
];

// Nom, slogan, contacts et réseaux sociaux affichés sur le site
const PlatformInfoForm = () => {
  const platform = useSettingsStore((s) => s.platform);
  const setPlatform = useSettingsStore((s) => s.setPlatform);
  const { saving, run } = useSave();
  const [draft, setDraft] = useState<Draft>(() => toDraft(platform));

  const errors: Partial<Record<TextField | `socials.${keyof Draft["socials"]}`, string>> = {
    name: draft.name.trim() ? undefined : "Indiquez le nom de la plateforme",
    email: emailSchema.safeParse(draft.email.trim()).success ? undefined : "Adresse e-mail invalide",
    phone: phoneError(draft.phone, true),
    phoneSecondary: phoneError(draft.phoneSecondary),
    whatsapp: phoneError(draft.whatsapp),
    "socials.instagram": urlError(draft.socials.instagram),
    "socials.facebook": urlError(draft.socials.facebook),
    "socials.tiktok": urlError(draft.socials.tiktok),
  };
  const invalid = Object.values(errors).some(Boolean);
  const changed = JSON.stringify(draft) !== JSON.stringify(toDraft(platform));

  const field = (key: TextField, label: ReactNode, props: ComponentProps<"input"> = {}) => {
    const phone = isPhoneField(key);
    const input = (
      <input
        id={`platform-${key}`}
        value={draft[key]}
        onChange={(e) =>
          setDraft((d) => ({ ...d, [key]: phone ? formatPhone(e.target.value) : e.target.value }))
        }
        aria-invalid={!!errors[key]}
        className={cn(adminInputClassName, phone && "pl-14")}
        {...(phone && { type: "tel", inputMode: "numeric", placeholder: "07 00 00 00 00" })}
        {...props}
      />
    );

    return (
      <div>
        <label htmlFor={`platform-${key}`} className={adminLabelClassName}>
          {label}
        </label>
        {phone ? (
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-sans text-sm text-taupe">
              {CI_DIAL_CODE}
            </span>
            {input}
          </div>
        ) : (
          input
        )}
        <FieldError message={errors[key]} />
      </div>
    );
  };

  const save = () => {
    const trim = (v: string) => v.trim();
    const phone = (v: string) => (v ? withDialCode(v) : "");
    return run(
      () =>
        setPlatform({
          name: trim(draft.name),
          tagline: trim(draft.tagline),
          email: trim(draft.email),
          phone: phone(draft.phone),
          phoneSecondary: phone(draft.phoneSecondary),
          whatsapp: phone(draft.whatsapp),
          socials: {
            instagram: trim(draft.socials.instagram),
            facebook: trim(draft.socials.facebook),
            tiktok: trim(draft.socials.tiktok),
          },
        }),
      () => {
        // Reprend les valeurs normalisées par l'API (e-mail en minuscules, numéros au format +225)
        setDraft(toDraft(useSettingsStore.getState().platform));
        toast.success("Informations enregistrées", { description: "Le site affiche les nouvelles informations." });
      },
    );
  };

  return (
    <AdminPanel className="flex flex-col gap-8">
      <div>
        <AdminPanelTitle>Informations de la plateforme</AdminPanelTitle>
        <p className="mt-1 font-sans text-sm text-taupe">
          Nom, slogan et contacts affichés dans l&apos;en-tête et le pied de page du site.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-cocoa">Identité</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {field("name", "Nom")}
          {field("tagline", "Slogan", { placeholder: "« Ne pas cacher. Prendre soin. »" })}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-cocoa">Contact</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {field("email", "E-mail", { type: "email" })}
          {field("phone", "Téléphone principal")}
          {field("phoneSecondary", "Téléphone secondaire")}
          {field("whatsapp", "WhatsApp")}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="font-serif text-lg text-cocoa">Réseaux sociaux</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {socialFields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label htmlFor={`platform-${key}`} className={adminLabelClassName}>
                {label}
              </label>
              <input
                id={`platform-${key}`}
                type="url"
                value={draft.socials[key]}
                placeholder={placeholder}
                onChange={(e) => setDraft((d) => ({ ...d, socials: { ...d.socials, [key]: e.target.value } }))}
                aria-invalid={!!errors[`socials.${key}`]}
                className={adminInputClassName}
              />
              <FieldError message={errors[`socials.${key}`]} />
            </div>
          ))}
        </div>
        <p className="font-sans text-xs text-taupe">Un réseau laissé vide n&apos;apparaît pas sur le site.</p>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-4">
        {changed && <p className="font-sans text-sm text-taupe">Modifications non enregistrées</p>}
        <button type="button" onClick={save} disabled={!changed || invalid || saving} className={adminButtonClassName}>
          Enregistrer les informations
        </button>
      </div>
    </AdminPanel>
  );
};

// Taille maximale : les logos sont gardés dans le navigateur en attendant le stockage de fichiers
const maxLogoBytes = 500 * 1024;

const logoVariants: { variant: LogoVariant; label: string; hint: string; previewClassName: string }[] = [
  {
    variant: "principal",
    label: "Principal",
    hint: "Version foncée, sur fond clair : en-tête au défilement, admin.",
    previewClassName: "bg-pearl",
  },
  {
    variant: "clair",
    label: "Clair",
    hint: "Version claire, sur fond sombre : en-tête sur les photos, pied de page.",
    previewClassName: "bg-cocoa",
  },
  {
    variant: "icone",
    label: "Icône",
    hint: "Format carré : menu replié de l'admin.",
    previewClassName: "bg-sand",
  },
];

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

// Variantes du logo, appliquées dès l'import
const LogoManager = () => {
  const { name, logos } = useSettingsStore((s) => s.platform);
  const setLogo = useSettingsStore((s) => s.setLogo);
  const { saving, run } = useSave();

  const upload = async (variant: LogoVariant, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Ce fichier n'est pas une image");
      return;
    }
    if (file.size > maxLogoBytes) {
      toast.error("Image trop lourde", { description: "500 Ko maximum : préférez un SVG ou un PNG optimisé." });
      return;
    }
    const dataUrl = await readAsDataUrl(file);
    await run(() => setLogo(variant, dataUrl), () => toast.success("Logo mis à jour"));
  };

  return (
    <AdminPanel className="flex flex-col gap-6">
      <div>
        <AdminPanelTitle>Logos</AdminPanelTitle>
        <p className="mt-1 font-sans text-sm text-taupe">
          SVG, PNG ou WebP, 500 Ko maximum. Sans logo, le nom de la plateforme s&apos;affiche en texte ; si une seule
          variante (principal ou clair) est fournie, elle sert partout.
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {logoVariants.map(({ variant, label, hint, previewClassName }) => {
          const src = logos[variant];
          const inputId = `logo-${variant}`;
          return (
            <li key={variant} className="flex flex-col gap-3 rounded-[var(--radius)] border border-sand p-4">
              <div
                className={cn(
                  "flex h-32 items-center justify-center overflow-hidden rounded-[var(--radius)] p-4",
                  previewClassName,
                )}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={`Logo ${label.toLowerCase()} de ${name}`} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span
                    className={cn(
                      "font-serif text-4xl leading-none",
                      variant === "clair" ? "text-pearl" : "text-cocoa",
                    )}
                  >
                    {variant === "icone" ? name.charAt(0).toUpperCase() : name}
                  </span>
                )}
              </div>
              <div>
                <p className="font-sans text-sm text-cocoa">{label}</p>
                <p className="mt-0.5 font-sans text-xs text-taupe">{hint}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <label htmlFor={inputId} className={cn(adminSmallOutlineButtonClassName, "cursor-pointer")}>
                  <ImageUp className="size-3.5" strokeWidth={1.75} />
                  {src ? "Remplacer" : "Importer"}
                </label>
                <input
                  id={inputId}
                  type="file"
                  accept="image/svg+xml,image/png,image/webp,image/jpeg"
                  className="sr-only"
                  onChange={(e) => {
                    upload(variant, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {src && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => run(() => setLogo(variant, undefined), () => toast("Logo retiré"))}
                    className={adminSmallOutlineButtonClassName}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                    Retirer
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </AdminPanel>
  );
};

export const PlatformSettings = () => (
  <>
    <LogoManager />
    <PlatformInfoForm />
  </>
);

"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import {
  AdminPageHeader,
  AdminPager,
  AdminSelect,
  adminInputClassName,
  adminSmallOutlineButtonClassName,
  chipClassName,
} from "@/components/admin/admin-ui";
import { AdminDatePicker } from "@/components/admin/admin-date-picker";
import { AdminExportButtons } from "@/components/admin/admin-export";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  JournalActorType,
  JournalCategory,
  JournalEntry,
  JournalFilters,
  JournalResult,
} from "@/lib/api/journal";
import { useAdminJournalStore } from "@/lib/stores/admin-journal-store";

const categoryLabels: Record<JournalCategory, string> = {
  connexion: "Connexions",
  reservation: "Réservations",
  commande: "Commandes",
  boutique: "Boutique",
  prestation: "Prestations",
  reglage: "Réglages",
};

const categories = Object.keys(categoryLabels) as JournalCategory[];

const actorLabels: Record<JournalActorType, string> = {
  client: "Client(e)",
  admin: "Admin",
  anonyme: "Non connecté(e)",
};

const actorFilters: { value: JournalActorType | "tous"; label: string }[] = [
  { value: "tous", label: "Tous les auteurs" },
  { value: "admin", label: "Admin" },
  { value: "client", label: "Client(e)s" },
  { value: "anonyme", label: "Non connecté(e)s" },
];

const resultFilters: { value: JournalResult | "tous"; label: string }[] = [
  { value: "tous", label: "Tous les résultats" },
  { value: "succes", label: "Réussis" },
  { value: "echec", label: "Connexions refusées" },
];

const formatDate = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: fr });
const formatTime = (iso: string) => format(new Date(iso), "HH:mm:ss");
// Jour d'une page (yyyy-MM-dd, heure d'Abidjan = UTC) : « mardi 28 octobre 2026 »
const formatDay = (day: string) => format(new Date(`${day}T12:00:00`), "EEEE d MMMM yyyy", { locale: fr });
const entriesLabel = (count: number) => `${count} entrée${count > 1 ? "s" : ""}`;

// Navigateur et système lisibles (« Chrome · Android ») ; le User-Agent complet reste au survol
const browserSummary = (userAgent: string) => {
  const browser = (
    [
      [/Edg\//, "Edge"],
      [/OPR\/|Opera/, "Opera"],
      [/SamsungBrowser/, "Samsung Internet"],
      [/Firefox\//, "Firefox"],
      [/Chrome\//, "Chrome"],
      [/Safari\//, "Safari"],
      [/PostmanRuntime/, "Postman"],
      [/curl\//, "curl"],
    ] as const
  ).find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = (
    [
      [/Android/, "Android"],
      [/iPhone|iPad|iOS/, "iOS"],
      [/Windows/, "Windows"],
      [/Mac OS X|Macintosh/, "macOS"],
      [/Linux/, "Linux"],
    ] as const
  ).find(([pattern]) => pattern.test(userAgent))?.[1];
  return [browser, system].filter(Boolean).join(" · ") || "Navigateur inconnu";
};

// Fiche de l'élément touché, quand elle existe encore (pas après une suppression)
const targetHref = (entry: JournalEntry) => {
  const target = entry.target;
  if (!target?.id || /supprim|retir/.test(entry.action)) return undefined;
  if (target.type === "reservation") return `/admin/reservations/${target.id}`;
  if (target.type === "commande") return `/admin/commandes/${target.id}`;
  if (target.type === "produit") return `/admin/boutique/produits/${encodeURIComponent(target.id)}`;
  return undefined;
};

const exportHeaders = [
  "Date",
  "Heure",
  "Catégorie",
  "Action",
  "Résultat",
  "Auteur",
  "Type d'auteur",
  "Élément",
  "Précision",
  "Adresse IP",
  "Navigateur",
];

const exportRow = (e: JournalEntry) => [
  formatDate(e.at),
  formatTime(e.at),
  categoryLabels[e.category],
  e.label,
  e.result === "succes" ? "Réussi" : "Refusé",
  e.actor.name ?? "",
  actorLabels[e.actor.type],
  e.target?.label ?? "",
  e.detail ?? "",
  e.ip ?? "",
  e.userAgent ?? "",
];

const EntryTarget = ({ entry }: { entry: JournalEntry }) => {
  const label = entry.target?.label ?? entry.target?.id;
  if (!label) return <span className="text-taupe">—</span>;
  const href = targetHref(entry);
  return href ? (
    <Link href={href} className="underline-offset-4 hover:underline">
      {label}
    </Link>
  ) : (
    <span>{label}</span>
  );
};

// Journal d'activité : connexions et actions sur les données, du plus récent au plus ancien, une page par jour.
// Filtres et recherche faits par l'API ; lecture seule
export const JournalList = () => {
  const page = useAdminJournalStore((s) => s.page);
  const pageError = useAdminJournalStore((s) => s.pageError);
  const loadPage = useAdminJournalStore((s) => s.loadPage);
  const fetchMatching = useAdminJournalStore((s) => s.fetchMatching);
  const [category, setCategory] = useState<JournalCategory | null>(null);
  const [actor, setActor] = useState<JournalActorType | null>(null);
  const [result, setResult] = useState<JournalResult | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  // 1 = jour le plus récent ayant des entrées
  const [dayNumber, setDayNumber] = useState(1);
  const search = useDeferredValue(query);

  const filters: JournalFilters = { category, actor, result, from, to, search };
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    void loadPage(JSON.parse(filtersKey) as JournalFilters, dayNumber);
  }, [filtersKey, dayNumber, loadPage]);

  if (!page && !pageError) return <div className="min-h-96" aria-hidden />;

  const days = page?.days ?? [];
  const currentDayNumber = page?.dayNumber ?? dayNumber;
  const currentDay = days[currentDayNumber - 1];
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const visible = page?.entries ?? [];
  const count = (value: JournalCategory | null) =>
    !page ? 0 : value ? page.countByCategory[value] : Object.values(page.countByCategory).reduce((a, b) => a + b, 0);
  const filtered = !!(category || actor || result || from || to || search.trim());

  const resetPage =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setDayNumber(1);
    };

  const resetFilters = () => {
    setCategory(null);
    setActor(null);
    setResult(null);
    setFrom("");
    setTo("");
    setQuery("");
    setDayNumber(1);
  };

  const loadExport = async () => ({
    title: "Journal d'activité",
    filename: "journal",
    headers: exportHeaders,
    rows: (await fetchMatching({ category, actor, result, from, to, search })).map(exportRow),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Journal"
        description="Connexions et actions sur les réservations, commandes, catalogues et réglages. Conservé un an."
      >
        <AdminExportButtons count={total} load={loadExport} />
      </AdminPageHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
          {[null, ...categories].map((value) => (
            <button
              key={value ?? "toutes"}
              type="button"
              aria-pressed={category === value}
              onClick={() => resetPage(setCategory)(value)}
              className={chipClassName(category === value)}
            >
              {value ? categoryLabels[value] : "Tout"} <span className="text-taupe tabular-nums">{count(value)}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-taupe" strokeWidth={1.75} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => resetPage(setQuery)(e.target.value)}
              placeholder="Auteur, référence, produit, IP…"
              aria-label="Rechercher dans le journal"
              className={`${adminInputClassName} pl-10`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-center">
            <AdminSelect
              label="Filtrer par auteur"
              value={actor ?? "tous"}
              onValueChange={(v) => resetPage(setActor)(v === "tous" ? null : v)}
              options={actorFilters}
              className="xl:w-48"
            />
            <AdminSelect
              label="Filtrer par résultat"
              value={result ?? "tous"}
              onValueChange={(v) => resetPage(setResult)(v === "tous" ? null : v)}
              options={resultFilters}
              className="xl:w-52"
            />
            <AdminDatePicker
              value={from}
              onChange={(value) => {
                resetPage(setFrom)(value);
                if (to && value > to) setTo(value);
              }}
              placeholder="Depuis le"
              className="xl:w-44"
            />
            <AdminDatePicker
              value={to}
              onChange={resetPage(setTo)}
              min={from || undefined}
              placeholder="Jusqu'au"
              className="xl:w-44"
            />
          </div>
        </div>
        {filtered && (
          <button type="button" onClick={resetFilters} className={`self-start ${adminSmallOutlineButtonClassName}`}>
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {pageError ? (
        <div role="alert" className="rounded-[var(--radius)] border border-sand p-6 font-sans text-sm text-cocoa">
          <p className="font-serif text-lg">Le journal n&apos;a pas pu être chargé.</p>
          <p className="mt-2 text-taupe">{pageError}</p>
          <button type="button" onClick={() => void loadPage(filters, dayNumber)} className="mt-4 underline underline-offset-4">
            Réessayer
          </button>
        </div>
      ) : visible.length > 0 && currentDay ? (
        <>
          <p className="font-sans text-sm text-cocoa">
            <span className="font-serif text-lg first-letter:uppercase inline-block">{formatDay(currentDay.day)}</span>
            <span className="ml-2 text-taupe">{entriesLabel(currentDay.count)}</span>
          </p>
          <div className="rounded-[var(--radius)] border border-sand">
            <Table className="font-sans text-cocoa">
              <TableHeader>
                <TableRow className="border-sand hover:bg-transparent">
                  <TableHead className="w-12 px-4 text-right text-taupe">#</TableHead>
                  <TableHead className="px-4 text-taupe">Heure</TableHead>
                  <TableHead className="px-4 text-taupe">Action</TableHead>
                  <TableHead className="px-4 text-taupe">Auteur</TableHead>
                  <TableHead className="px-4 text-taupe">Élément</TableHead>
                  <TableHead className="px-4 text-taupe">Origine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((entry, index) => (
                  <TableRow key={entry.id} className="border-sand hover:bg-transparent">
                    <TableCell className="px-4 py-3 text-right align-top text-taupe tabular-nums">{index + 1}</TableCell>
                    <TableCell className="px-4 py-3 align-top tabular-nums whitespace-nowrap">{formatTime(entry.at)}</TableCell>
                    <TableCell className="max-w-80 px-4 py-3 align-top whitespace-normal">
                      <p className="flex flex-wrap items-center gap-2">
                        {entry.label}
                        {entry.result === "echec" && (
                          <span className="inline-flex rounded-full border border-cocoa px-2.5 py-0.5 text-xs whitespace-nowrap">
                            Refusée
                          </span>
                        )}
                      </p>
                      {entry.detail && <p className="mt-0.5 text-xs text-taupe">{entry.detail}</p>}
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top">
                      <p>{entry.actor.name ?? <span className="text-taupe">Inconnu</span>}</p>
                      <p className="text-xs text-taupe">{actorLabels[entry.actor.type]}</p>
                    </TableCell>
                    <TableCell className="max-w-64 px-4 py-3 align-top whitespace-normal">
                      <EntryTarget entry={entry} />
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top">
                      <p className="tabular-nums">{entry.ip ?? <span className="text-taupe">—</span>}</p>
                      {entry.userAgent && (
                        <p className="text-xs text-taupe" title={entry.userAgent}>
                          {browserSummary(entry.userAgent)}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <AdminPager
            page={currentDayNumber}
            pageCount={days.length}
            onPageChange={setDayNumber}
            label={
              <>
                Jour {currentDayNumber} sur {days.length}
                <span className="block text-xs text-taupe first-letter:uppercase">{formatDay(currentDay.day)}</span>
              </>
            }
          />
        </>
      ) : (
        <div className="flex flex-col items-center rounded-[var(--radius)] border border-sand py-16 text-center">
          <p className="font-serif text-lg text-cocoa">
            {filtered ? "Aucune entrée ne correspond à ces filtres." : "Le journal est vide pour le moment."}
          </p>
          {filtered && (
            <button type="button" onClick={resetFilters} className={`mt-6 ${adminSmallOutlineButtonClassName}`}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}
    </div>
  );
};
